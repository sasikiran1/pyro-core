# Demo slides

`deck.html` is the source of `docs/PYRO-CORE-demo-slides.pdf` (7 slides, 16:9). To regenerate the PDF after editing, print it with Microsoft Edge or Chrome in headless mode (Windows PowerShell):

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --no-pdf-header-footer --virtual-time-budget=8000 --print-to-pdf="$PWD\docs\PYRO-CORE-demo-slides.pdf" "file:///$($PWD -replace '\','/')/docs/slides/deck.html"
```

Or open `deck.html` in a browser and use Print → Save as PDF with margins set to None and background graphics on.
