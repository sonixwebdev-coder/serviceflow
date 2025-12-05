# Custom Fonts for PDF Generation

To render Romanian diacritics (ș, ț, ă, î, â) in generated PDFs, place Unicode
TrueType font files in this directory and point the service to them.

Recommended setup:

1. Download **Noto Sans** (Regular and Bold) TTF files from
   https://fonts.google.com/specimen/Noto+Sans
2. Save them here as:
   - `NotoSans-Regular.ttf`
   - `NotoSans-Bold.ttf`
3. (Optional) Customize paths via environment variables:
   ```env
   PDF_FONT_REGULAR_PATH=assets/fonts/NotoSans-Regular.ttf
   PDF_FONT_BOLD_PATH=assets/fonts/NotoSans-Bold.ttf
   ```

If no custom fonts are found, the system falls back to Helvetica and ASCII-only
output (diacritics will be simplified).
