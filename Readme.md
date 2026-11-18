# Reveal Handwriting Extension For Quarto

Extension to provide a reveal.js plugin for handwriting directly on the slides with pen in different colors,
marker, eraser and lasso select function. Writing works with pen only, tested on windows and android (not yet on ipad or mac)

## Installing

```bash
quarto add FBTHN/revealHandwriting
```

This will install the extension under the `_extensions` subdirectory.
If you're using version control, you will want to check in this directory.

## Using

Add the extension to your reveal.js presentation. A drawing menu will appear on the lower left with pen, line, rectangle, circle, and arc tools, plus an undo button for the last 20 drawing actions. Define a rectangle by selecting two opposite corners. To draw an arc, select its center, a point on the circumference, then the ending point on the circumference. After completing a shape, choose a fill color to fill it; for an arc, the fill covers the sector bounded by the arc and its two radii.

Paste a PNG or JPEG screenshot while the presentation is focused to add it to the current slide. The image is placed below handwriting; use the mouse or touch to move it, and its handles to resize or rotate it. SVG clipboard content is not supported.

## Example

Here is the source code for a minimal example: [example.qmd](example.qmd).

