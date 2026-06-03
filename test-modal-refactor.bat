@echo off
echo =========================================
echo   Modal Refactoring - Quick Test
echo =========================================
echo.

echo Starting HTTP server on port 8080...
echo.
echo Open your browser and visit:
echo   http://localhost:8080
echo.
echo Test checklist:
echo   [ ] Click a vocabulary word
echo   [ ] Modal opens smoothly
echo   [ ] All sections display correctly
echo   [ ] Character breakdown works
echo   [ ] Stroke animation plays
echo   [ ] Examples show up
echo   [ ] Close button works
echo   [ ] Escape key closes modal
echo.
echo Press Ctrl+C to stop the server
echo.

npx http-server -p 8080 -c-1
