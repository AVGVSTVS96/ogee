---
name: ogee
description: Show something visual in a chat that only takes text (Telegram, iMessage, Discord, Slack, any bot pipeline). Turns HTML, an image or an mp4 into a link whose link preview is the thing itself; HTML can play as an inline video. Use for charts, dashboards, status cards, diffs, or any small visual artifact you'd otherwise describe in words.
---

# ogee

Chat apps don't render HTML, but they render link previews. ogee turns your HTML, image or mp4 into a fresh link whose preview is that content: a full-width image, or a muted video that autoplays inline in Telegram and iMessage. Apps that don't play video show the first frame instead.

## Make one

Write a self-contained HTML page sized for the preview (1200×630 by default: inline CSS, no external scripts it depends on), then:

```sh
npx ogee card.html --title "Deploys this week"            # still image
npx ogee card.html --title "Agent run" --video 4          # animated HTML recorded to a 4s video
npx ogee chart.png                                       # an image you already have
echo '<h1>hi</h1>' | npx ogee - --title "hi"             # HTML from stdin
```

It prints the link. `--json` prints the image and video URLs too. It needs `OGEE_KEY`; `OGEE_URL` points it at a self-hosted server.

Without the CLI it's one request:

```sh
curl -X POST "$OGEE_URL/api?title=Deploys&video=4" \
  -H "authorization: Bearer $OGEE_KEY" -H "content-type: text/html" --data-binary @card.html
```

## Send it

Send the link with link previews on, ideally as the only link in the message, since apps preview the first one. The title shows above the preview, so give every artifact a short, real title.

## Update it

Every call returns a new link, which is what keeps previews from going stale: apps cache a preview by its link and never fetch the same one twice. To update an artifact, make a new one and edit your earlier message to the new link; Telegram swaps the preview in place.

## Make it look right

- Design for a phone: big type (40px+ for the main number or headline), high contrast, one idea per card.
- Animations run on a recorded clock, so CSS animations, `requestAnimationFrame` and timers all play smoothly from frame zero. Keep videos short (2–6s); the last frame becomes the still.
- Tapping the link opens the live HTML, so it can be interactive beyond the preview.
