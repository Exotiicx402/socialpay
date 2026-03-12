# Polymarket Creative Request Tracker

An automated tool that scans the `#hours-creative-polymarket` Slack channel, extracts creative requests using AI (GPT-4), and maintains a live Slack Canvas tracker plus a CSV export — all matching the existing PM Creative Tracker format.

## What It Does

**Initial Scan:** Reads the entire channel history, identifies every creative request (even informal ones that bypassed the form), and populates:
- A **Slack Canvas** in the workspace (live, auto-updating tracker)
- A **CSV file** matching the PM Creative Tracker column format

**Ongoing Monitoring:** Run daily (or on-demand) to detect new requests and update both the canvas and CSV automatically.

## How It Works

1. Paginates through all messages in `#hours-creative-polymarket`
2. Sends batches of messages to GPT-4 with a prompt that identifies creative requests vs. general chat
3. Extracts structured fields: Name, Platform, Submitted by, Date, Ad Size/Format, Priority, Description, Figma URLs, File attachments, Status
4. Saves to CSV and updates the Slack Canvas
5. Posts a summary notification in the channel

## Setup

### Requirements

```bash
pip install openai slack-sdk python-dotenv
```

The script uses:
- `OPENAI_API_KEY` — set in environment
- Slack MCP CLI (`manus-mcp-cli`) — pre-configured with OAuth

### Running

**Initial scan (full history):**
```bash
python3 tracker.py
```

**Incremental update (new messages only):**
```bash
python3 tracker.py update
```

### Automated Daily Updates

To run daily at 9am, add to crontab:
```
0 9 * * * cd /path/to/creative-tracker && python3 tracker.py update >> tracker.log 2>&1
```

## Output Files

| File | Description |
|------|-------------|
| `creative_requests.csv` | All extracted requests in PM Creative Tracker format |
| `tracker_state.json` | State file tracking processed messages and canvas ID |

## CSV Columns

Matches the PM Creative Tracker format exactly:

| Column | Description |
|--------|-------------|
| Name | Short descriptive name for the request |
| Platform | Where the creative will be used (Meta, X, Google, Email, etc.) |
| Submitted by | Person who submitted the request |
| Date submitted | Date in MM/DD/YY format |
| Ad Size / Format | Dimensions or aspect ratio |
| Priority | High / Medium / Low |
| Description | Full request description |
| Inspiration | Reference links or inspiration |
| Figma URL | Figma design links |
| File Upload | Attached files |
| Status | New / In Progress / Complete |
| Assigned | Assigned team member |
| Slack Thread URL | Link to original Slack thread |
| Message TS | Slack message timestamp (for deduplication) |

## Slack Canvas

The tracker lives as a Canvas in the Slack workspace. It includes:
- Summary stats (total requests, by status)
- Full table of all requests
- Detailed descriptions for each request

Canvas ID is stored in `tracker_state.json` and reused on updates.

## Architecture

```
tracker.py
├── collect_all_messages()     — Paginates through channel history via MCP CLI
├── parse_message_blocks()     — Parses raw MCP output into structured dicts
├── extract_requests_from_batch() — AI extraction using GPT-4.1-mini
├── save_to_csv()              — Writes to CSV in PM tracker format
├── create_or_update_canvas()  — Creates/updates Slack Canvas
├── post_summary_to_channel()  — Posts notification to channel
├── run_initial_scan()         — Full history scan
└── run_incremental_update()   — New messages only
```
