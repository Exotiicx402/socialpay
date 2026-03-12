"""
Polymarket Creative Request Tracker
====================================
Scans #hours-creative-polymarket channel history, extracts creative requests
using AI, and maintains a Slack Canvas tracker + CSV export.
"""

import subprocess
import json
import os
import csv
import time
import re
from datetime import datetime
from openai import OpenAI

# ── Config ──────────────────────────────────────────────────────────────────
CHANNEL_ID = "C09HBDKSUGH"
CHANNEL_NAME = "#hours-creative-polymarket"
CSV_OUTPUT = "/home/ubuntu/creative-tracker/creative_requests.csv"
STATE_FILE = "/home/ubuntu/creative-tracker/tracker_state.json"
MAX_PAGES = 50  # safety cap on history pagination

# CSV columns matching the PM Creative Tracker format
CSV_FIELDS = [
    "Name", "Platform", "Submitted by", "Date submitted",
    "Ad Size / Format", "Priority", "Description",
    "Inspiration", "Figma URL", "File Upload", "Status",
    "Assigned", "Slack Thread URL", "Message TS"
]

client = OpenAI()


# ── MCP CLI helpers ──────────────────────────────────────────────────────────

def mcp_call(tool: str, args: dict) -> dict:
    """Call a Slack MCP tool and return parsed result."""
    result = subprocess.run(
        ["manus-mcp-cli", "tool", "call", tool, "--server", "slack",
         "--input", json.dumps(args)],
        capture_output=True, text=True, timeout=60
    )
    # The result is printed to stdout as JSON after the header line
    output = result.stdout
    # Find the JSON part (after "Tool execution result:")
    json_start = output.find('{"')
    if json_start == -1:
        json_start = output.find("{'")
    if json_start != -1:
        try:
            return json.loads(output[json_start:])
        except json.JSONDecodeError:
            pass
    # Fall back to reading the saved result file
    lines = output.strip().split('\n')
    for line in lines:
        if 'saved to:' in line:
            filepath = line.split('saved to:')[-1].strip()
            try:
                with open(filepath) as f:
                    return json.load(f)
            except Exception:
                pass
    return {"error": output, "stderr": result.stderr}


def read_channel_page(cursor: str = None, limit: int = 30) -> dict:
    """Read one page of channel messages."""
    args = {"channel_id": CHANNEL_ID, "limit": limit}
    if cursor:
        args["cursor"] = cursor
    return mcp_call("slack_read_channel", args)


def read_thread(channel_id: str, thread_ts: str) -> dict:
    """Read a thread's replies."""
    return mcp_call("slack_read_thread", {
        "channel_id": channel_id,
        "thread_ts": thread_ts
    })


# ── Channel history collection ───────────────────────────────────────────────

def collect_all_messages() -> list[dict]:
    """
    Paginate through the entire channel history and collect raw message blocks.
    Returns a list of message dicts with text, ts, sender, files, thread info.
    """
    all_messages = []
    cursor = None
    page = 0

    print(f"📥 Collecting message history from {CHANNEL_NAME}...")

    while page < MAX_PAGES:
        page += 1
        result = read_channel_page(cursor=cursor, limit=30)

        if "error" in result and "messages" not in result:
            print(f"  ⚠️  Error on page {page}: {result.get('error', '')[:100]}")
            break

        raw = result.get("messages", "")
        messages = parse_message_blocks(raw)
        all_messages.extend(messages)
        print(f"  Page {page}: collected {len(messages)} messages (total: {len(all_messages)})")

        # Check pagination
        pagination = result.get("pagination_info", "")
        if "No more pages" in pagination or "End of results" in pagination:
            print(f"  ✅ Reached end of history.")
            break

        # Extract cursor
        cursor_match = re.search(r'cursor: `([^`]+)`', pagination)
        if not cursor_match:
            print(f"  ✅ No more cursor found.")
            break
        cursor = cursor_match.group(1)
        time.sleep(0.5)  # rate limit courtesy

    print(f"\n📊 Total messages collected: {len(all_messages)}")
    return all_messages


def parse_message_blocks(raw_text: str) -> list[dict]:
    """
    Parse the formatted message text from slack_read_channel into structured dicts.
    """
    messages = []
    if not raw_text:
        return messages

    # Split on message separators
    blocks = re.split(r'=== Message', raw_text)

    for block in blocks[1:]:  # skip header
        msg = {}

        # Extract timestamp line
        ts_match = re.match(r'\s+(?:from\s+(.+?)\s+\((\S+)\)\s+)?at\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+\w+)', block)
        if ts_match:
            msg["sender_name"] = ts_match.group(1) or ""
            msg["sender_id"] = ts_match.group(2) or ""
            msg["timestamp_str"] = ts_match.group(3)

        # Extract message TS
        ts_field = re.search(r'Message TS:\s+(\S+)', block)
        if ts_field:
            msg["ts"] = ts_field.group(1)

        # Extract thread info
        thread_match = re.search(r'Thread:\s+(\d+)\s+replies.*?latest:\s+([^)]+)\)', block)
        if thread_match:
            msg["has_thread"] = True
            msg["thread_replies"] = int(thread_match.group(1))
        else:
            msg["has_thread"] = False

        # Extract files
        files_match = re.search(r'Files:\s+(.+?)(?:\n|$)', block)
        if files_match:
            msg["files"] = files_match.group(1).strip()

        # Extract reactions
        reactions_match = re.search(r'Reactions:\s+(.+?)(?:\n|$)', block)
        if reactions_match:
            msg["reactions"] = reactions_match.group(1).strip()

        # Extract main text (between TS line and Thread/Files/Reactions)
        # Remove header lines and extract body
        lines = block.split('\n')
        text_lines = []
        skip_prefixes = ('Message TS:', 'Thread:', 'Files:', 'Reactions:')
        in_header = True
        for line in lines:
            stripped = line.strip()
            if in_header and (not stripped or re.match(r'\d{4}-\d{2}-\d{2}', stripped)):
                in_header = False
                continue
            if in_header:
                continue
            if any(stripped.startswith(p) for p in skip_prefixes):
                continue
            text_lines.append(line)

        msg["text"] = '\n'.join(text_lines).strip()

        # Skip join/leave messages and empty messages
        if not msg.get("text") or re.search(r'has joined the channel|has left the channel', msg.get("text", "")):
            continue

        # Skip bot form submission messages (already tracked)
        if "New Creative Request Submitted" in msg.get("text", ""):
            msg["is_form_submission"] = True

        messages.append(msg)

    return messages


# ── AI request extraction ────────────────────────────────────────────────────

EXTRACTION_SYSTEM_PROMPT = """You are an expert at analyzing Slack messages in a creative agency channel and identifying creative work requests.

You will be given a batch of Slack messages from a channel where a client (Polymarket) submits creative requests to an agency (Hours Global).

For each message that represents a creative request, extract the following fields:
- name: Short descriptive name for the request (2-6 words, e.g. "UFC 325 Graphic", "Email Header Oscars")
- platform: Where the creative will be used (Meta, X/Twitter, Google, Email, Display, Social, OOH, YouTube, Newsletter, etc.)
- submitted_by: Email or name of the person who submitted it
- date_submitted: Date in MM/DD/YY format
- ad_size_format: Dimensions or format (e.g. "1:1, 9:16", "300x250", "16:9")
- priority: High, Medium, or Low based on urgency language in the message
- description: Full description of what was requested (keep original detail)
- inspiration: Any reference links or inspiration mentioned
- figma_url: Any Figma links mentioned
- file_upload: Any file attachments mentioned
- status: "New" for all historical requests (we don't know completion status)
- assigned: Leave blank
- slack_thread_url: Leave blank (will be filled separately)
- message_ts: The message timestamp

A message IS a creative request if it:
- Asks for a graphic, ad, banner, animation, GIF, video, email asset, or any visual creative
- Uses language like "can we get", "need a", "can I get", "please make", "would love to have"
- Describes specific creative deliverables with dimensions, platforms, or visual concepts

A message is NOT a creative request if it:
- Is a reply/follow-up to an existing request
- Is a general discussion, feedback, or status update
- Is a "joined the channel" notification
- Is a bot form submission notification

Return a JSON array. Each element should be an object with the fields above.
If no requests are found in the batch, return an empty array [].

Be thorough — err on the side of including borderline requests."""


def extract_requests_from_batch(messages: list[dict]) -> list[dict]:
    """Use AI to extract creative requests from a batch of messages."""
    if not messages:
        return []

    # Format messages for the prompt
    formatted = []
    for msg in messages:
        if not msg.get("text"):
            continue
        entry = f"""---
Timestamp: {msg.get('timestamp_str', 'Unknown')}
Message TS: {msg.get('ts', '')}
Sender: {msg.get('sender_name', 'Unknown')} ({msg.get('sender_id', '')})
Has Thread: {msg.get('has_thread', False)} ({msg.get('thread_replies', 0)} replies)
Files: {msg.get('files', 'None')}
Text:
{msg.get('text', '')}"""
        formatted.append(entry)

    if not formatted:
        return []

    batch_text = '\n'.join(formatted)

    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                {"role": "user", "content": f"Extract creative requests from these messages:\n\n{batch_text}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        content = response.choices[0].message.content
        parsed = json.loads(content)
        # Handle both {"requests": [...]} and direct array
        if isinstance(parsed, list):
            return parsed
        elif isinstance(parsed, dict):
            for key in ["requests", "creative_requests", "results", "data"]:
                if key in parsed and isinstance(parsed[key], list):
                    return parsed[key]
        return []
    except Exception as e:
        print(f"  ⚠️  AI extraction error: {e}")
        return []


# ── Main processing pipeline ─────────────────────────────────────────────────

def process_channel_history() -> list[dict]:
    """Full pipeline: collect messages → extract requests → return structured list."""

    # Load existing state to avoid re-processing
    state = load_state()
    processed_ts = set(state.get("processed_ts", []))

    # Collect all messages
    all_messages = collect_all_messages()

    # Filter out already-processed messages and non-request messages
    new_messages = [
        m for m in all_messages
        if m.get("ts") not in processed_ts
        and not m.get("is_form_submission")
        and m.get("text")
    ]

    print(f"\n🤖 Running AI extraction on {len(new_messages)} messages...")

    # Process in batches of 15 to stay within token limits
    BATCH_SIZE = 15
    all_requests = []

    for i in range(0, len(new_messages), BATCH_SIZE):
        batch = new_messages[i:i + BATCH_SIZE]
        print(f"  Batch {i//BATCH_SIZE + 1}/{(len(new_messages)-1)//BATCH_SIZE + 1} ({len(batch)} messages)...")
        requests = extract_requests_from_batch(batch)
        all_requests.extend(requests)
        print(f"    → Found {len(requests)} requests")
        time.sleep(0.5)

    print(f"\n✅ Total requests extracted: {len(all_requests)}")

    # Mark all messages as processed
    for msg in new_messages:
        if msg.get("ts"):
            processed_ts.add(msg["ts"])

    # Save state
    save_state({
        "processed_ts": list(processed_ts),
        "last_run": datetime.now().isoformat(),
        "total_requests": len(all_requests)
    })

    return all_requests


# ── CSV export ───────────────────────────────────────────────────────────────

def save_to_csv(requests: list[dict], mode: str = "w"):
    """Save extracted requests to CSV matching the PM Creative Tracker format."""
    os.makedirs(os.path.dirname(CSV_OUTPUT), exist_ok=True)

    with open(CSV_OUTPUT, mode, newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS, extrasaction='ignore')
        if mode == "w":
            writer.writeheader()

        for req in requests:
            row = {
                "Name": req.get("name", ""),
                "Platform": req.get("platform", ""),
                "Submitted by": req.get("submitted_by", ""),
                "Date submitted": req.get("date_submitted", ""),
                "Ad Size / Format": req.get("ad_size_format", ""),
                "Priority": req.get("priority", "Medium"),
                "Description": req.get("description", ""),
                "Inspiration": req.get("inspiration", ""),
                "Figma URL": req.get("figma_url", ""),
                "File Upload": req.get("file_upload", ""),
                "Status": req.get("status", "New"),
                "Assigned": req.get("assigned", ""),
                "Slack Thread URL": req.get("slack_thread_url", ""),
                "Message TS": req.get("message_ts", ""),
            }
            writer.writerow(row)

    print(f"💾 Saved {len(requests)} requests to {CSV_OUTPUT}")


# ── Slack Canvas tracker ─────────────────────────────────────────────────────

def format_canvas_content(requests: list[dict]) -> str:
    """Format requests as Slack Canvas markdown."""
    now = datetime.now().strftime("%B %d, %Y at %I:%M %p")

    lines = [
        f"Last updated: {now}",
        "",
        f"This canvas tracks all creative requests submitted in {CHANNEL_NAME}. "
        f"It is automatically populated from channel history and updated as new requests come in.",
        "",
        "## Summary",
        "",
    ]

    # Count by status
    status_counts = {}
    platform_counts = {}
    for r in requests:
        s = r.get("status", "New")
        status_counts[s] = status_counts.get(s, 0) + 1
        p = r.get("platform", "Unknown")
        platform_counts[p] = platform_counts.get(p, 0) + 1

    lines.append(f"**Total Requests:** {len(requests)}")
    lines.append("")

    status_table = "| Status | Count |\n|--------|-------|\n"
    for status, count in sorted(status_counts.items()):
        status_table += f"| {status} | {count} |\n"
    lines.append(status_table)

    lines.append("")
    lines.append("## All Creative Requests")
    lines.append("")
    lines.append("The table below lists all identified creative requests from the channel history, ordered by date submitted.")
    lines.append("")

    # Build table
    table = "| # | Name | Platform | Submitted by | Date | Size/Format | Priority | Status |\n"
    table += "|---|------|----------|--------------|------|-------------|----------|--------|\n"

    for i, req in enumerate(requests, 1):
        name = req.get("name", "")[:40]
        platform = req.get("platform", "")[:20]
        submitted_by = req.get("submitted_by", "")[:25]
        date = req.get("date_submitted", "")
        size = req.get("ad_size_format", "")[:20]
        priority = req.get("priority", "")
        status = req.get("status", "New")

        # Escape pipes
        for field in [name, platform, submitted_by, date, size, priority, status]:
            field = str(field).replace("|", "\\|")

        table += f"| {i} | {name} | {platform} | {submitted_by} | {date} | {size} | {priority} | {status} |\n"

    lines.append(table)

    lines.append("")
    lines.append("## Request Details")
    lines.append("")
    lines.append("Full descriptions for each request are listed below.")
    lines.append("")

    for i, req in enumerate(requests, 1):
        name = req.get("name", f"Request {i}")
        lines.append(f"### {i}. {name}")
        lines.append("")

        details = [
            ("Platform", req.get("platform", "")),
            ("Submitted by", req.get("submitted_by", "")),
            ("Date", req.get("date_submitted", "")),
            ("Size/Format", req.get("ad_size_format", "")),
            ("Priority", req.get("priority", "")),
            ("Status", req.get("status", "New")),
        ]

        for label, value in details:
            if value:
                lines.append(f"**{label}:** {value}")

        desc = req.get("description", "")
        if desc:
            lines.append("")
            lines.append(desc[:500])

        inspiration = req.get("inspiration", "")
        if inspiration:
            lines.append("")
            lines.append(f"**Inspiration/Reference:** {inspiration}")

        figma = req.get("figma_url", "")
        if figma:
            lines.append(f"**Figma:** {figma}")

        lines.append("")

    return '\n'.join(lines)


def create_or_update_canvas(requests: list[dict]) -> str:
    """Create or update the Slack Canvas with all requests."""
    state = load_state()
    canvas_id = state.get("canvas_id")

    content = format_canvas_content(requests)

    if canvas_id:
        print(f"📝 Updating existing canvas {canvas_id}...")
        result = mcp_call("slack_update_canvas", {
            "canvas_id": canvas_id,
            "action": "replace",
            "content": content
        })
        canvas_url = result.get("canvas_url", "")
        print(f"  ✅ Canvas updated: {canvas_url}")
        return canvas_url
    else:
        print("📝 Creating new Slack Canvas...")
        result = mcp_call("slack_create_canvas", {
            "title": "Polymarket Creative Request Tracker",
            "content": content
        })
        canvas_url = result.get("canvas_url", "")
        canvas_id_new = result.get("canvas_id", "")
        if canvas_id_new:
            state["canvas_id"] = canvas_id_new
            save_state(state)
        print(f"  ✅ Canvas created: {canvas_url}")
        return canvas_url


# ── State management ─────────────────────────────────────────────────────────

def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {}


def save_state(state: dict):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)


# ── Notification ─────────────────────────────────────────────────────────────

def post_summary_to_channel(requests: list[dict], canvas_url: str, is_initial: bool = True):
    """Post a summary message to the channel."""
    if is_initial:
        count = len(requests)
        new_count = sum(1 for r in requests if r.get("status") == "New")
        msg = (
            f"*Creative Request Tracker — Initial Scan Complete* :white_check_mark:\n\n"
            f"I've scanned the full history of {CHANNEL_NAME} and identified *{count} creative requests*.\n\n"
            f"The tracker has been populated and is available as a Slack Canvas:\n"
            f"{canvas_url}\n\n"
            f"A CSV export has also been generated. Going forward, I'll automatically detect and log "
            f"new creative requests as they come in."
        )
    else:
        new_reqs = [r for r in requests if r.get("is_new")]
        if not new_reqs:
            return
        names = ', '.join(r.get("name", "Request") for r in new_reqs[:3])
        if len(new_reqs) > 3:
            names += f" (+{len(new_reqs)-3} more)"
        msg = (
            f"*Creative Tracker Update* :memo:\n\n"
            f"*{len(new_reqs)} new request(s)* detected and added to the tracker:\n"
            f"• {names}\n\n"
            f"View the full tracker: {canvas_url}"
        )

    mcp_call("slack_send_message", {
        "channel_id": CHANNEL_ID,
        "message": msg
    })
    print(f"📣 Summary posted to {CHANNEL_NAME}")


# ── Entry point ───────────────────────────────────────────────────────────────

def run_initial_scan():
    """Run the full initial scan of channel history."""
    print("=" * 60)
    print("  Polymarket Creative Request Tracker — Initial Scan")
    print("=" * 60)
    print()

    # Process history
    requests = process_channel_history()

    if not requests:
        print("⚠️  No requests found. Check channel access and try again.")
        return

    # Sort by date (newest first for canvas, but we'll keep chronological)
    # Save CSV
    save_to_csv(requests)

    # Create/update canvas
    canvas_url = create_or_update_canvas(requests)

    # Post summary
    if canvas_url:
        post_summary_to_channel(requests, canvas_url, is_initial=True)

    print("\n" + "=" * 60)
    print(f"  ✅ Done! {len(requests)} requests tracked.")
    print(f"  📄 CSV: {CSV_OUTPUT}")
    print(f"  🖼️  Canvas: {canvas_url}")
    print("=" * 60)

    return requests, canvas_url


def run_incremental_update():
    """Check for new requests since last run and update tracker."""
    print("=" * 60)
    print("  Polymarket Creative Request Tracker — Incremental Update")
    print("=" * 60)
    print()

    state = load_state()
    if not state.get("processed_ts"):
        print("No previous state found. Running initial scan instead...")
        return run_initial_scan()

    # Collect only recent messages (last 2 pages should be enough for daily updates)
    all_messages = []
    cursor = None
    processed_ts = set(state.get("processed_ts", []))

    for _ in range(3):  # check last 3 pages
        result = read_channel_page(cursor=cursor, limit=30)
        raw = result.get("messages", "")
        messages = parse_message_blocks(raw)
        new_msgs = [m for m in messages if m.get("ts") not in processed_ts and not m.get("is_form_submission")]
        all_messages.extend(new_msgs)

        pagination = result.get("pagination_info", "")
        if "No more pages" in pagination:
            break
        cursor_match = re.search(r'cursor: `([^`]+)`', pagination)
        if not cursor_match:
            break
        cursor = cursor_match.group(1)

    if not all_messages:
        print("✅ No new messages to process.")
        return

    print(f"🤖 Processing {len(all_messages)} new messages...")
    new_requests = extract_requests_from_batch(all_messages)

    if not new_requests:
        print("✅ No new creative requests found.")
        return

    for r in new_requests:
        r["is_new"] = True

    print(f"✅ Found {len(new_requests)} new requests")

    # Load existing requests from CSV and append
    existing = []
    if os.path.exists(CSV_OUTPUT):
        with open(CSV_OUTPUT, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                existing.append(row)

    all_requests_combined = existing + new_requests

    # Append to CSV
    save_to_csv(new_requests, mode="a")

    # Update canvas with all requests
    canvas_url = create_or_update_canvas(all_requests_combined)

    # Post update to channel
    if canvas_url:
        post_summary_to_channel(new_requests, canvas_url, is_initial=False)

    # Update state
    for msg in all_messages:
        if msg.get("ts"):
            processed_ts.add(msg["ts"])
    state["processed_ts"] = list(processed_ts)
    state["last_run"] = datetime.now().isoformat()
    save_state(state)


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "update":
        run_incremental_update()
    else:
        run_initial_scan()
