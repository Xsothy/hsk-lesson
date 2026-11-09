<?php

namespace App\Services\Worksheet;

/**
 * Renders stroke-order practice sheets as PDF bytes. Reusable by any caller that can build
 * WorksheetItems (F2 builder, F9 My words export): see WorksheetSource::items().
 * Hanzi are drawn as vector outlines from stroke data, Latin text uses TCPDF's bundled DejaVu Sans.
 */
class WorksheetPdf
{
    private const MARGIN = 12.0;

    private const CELL = 15.0;   // mm per practice square

    private const HEAD = 7.5;    // label + stroke-order strip above each row

    private const GAP = 3.5;

    private const STEP = 5.6;    // stroke-order strip glyph size

    /** @param list<WorksheetItem> $items */
    public function render(string $title, array $items, WorksheetOptions $o): string
    {
        $pdf = new WorksheetDocument('P', 'mm', 'A4', true, 'UTF-8');
        $pdf->SetCreator(config('app.name'));
        $pdf->SetTitle($title);
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(true);
        $pdf->footerText = 'Stroke data: Make Me a Hanzi (Arphic Public License)';
        $side = (210 - WorksheetOptions::CELLS * self::CELL) / 2;
        $pdf->SetMargins($side, self::MARGIN, $side);
        $pdf->SetAutoPageBreak(false);
        $pdf->AddPage();

        $width = WorksheetOptions::CELLS * self::CELL;
        $left = (210 - $width) / 2;
        $y = $this->title($pdf, $title, $left);
        $rowH = self::HEAD + self::CELL + self::GAP;

        foreach ($items as $item) {
            if ($y + $rowH > 297 - 14) {
                $pdf->AddPage();
                $y = self::MARGIN;
            }
            $this->row($pdf, $item, $left, $y, $width, $o);
            $y += $rowH;
        }

        return $pdf->Output('worksheet.pdf', 'S');
    }

    private function title(WorksheetDocument $pdf, string $title, float $left): float
    {
        $pdf->SetTextColor(20, 20, 20);
        $pdf->SetFont('dejavusans', 'B', 14);
        $pdf->SetXY($left, self::MARGIN);
        $pdf->Cell(0, 7, $title, 0, 1);
        $pdf->SetFont('dejavusans', '', 8);
        $pdf->SetTextColor(120, 120, 120);
        $pdf->SetX($left);
        $pdf->Cell(0, 5, 'Name: ______________________    Date: ______________', 0, 1);

        return self::MARGIN + 16;
    }

    private function row(WorksheetDocument $pdf, WorksheetItem $item, float $left, float $y, float $width, WorksheetOptions $o): void
    {
        $n = count($item->strokes);
        $pitch = self::STEP + 0.4;

        // Stroke-order strip, right-aligned: step k shows strokes 1..k with the newest one in black.
        $steps = $o->strip ? min($n, (int) floor(($width * 0.65) / $pitch)) : 0; // the strip can be switched off
        $sx = $left + $width - $steps * $pitch;
        for ($k = 1; $k <= $steps; $k++) {
            $gx = $sx + ($k - 1) * $pitch;
            $count = $k === $steps ? $n : $k; // if the strip is cut short, the last step shows the rest
            $newFrom = $k === $steps ? $k - 1 : $count - 1;
            $pdf->SetFillColor(185, 185, 185);
            $pdf->glyph($item->strokes, $gx, $y + 0.8, self::STEP, $newFrom);
            $pdf->SetFillColor(20, 20, 20);
            $pdf->glyph($item->strokes, $gx, $y + 0.8, self::STEP, $count, $newFrom);
        }

        // Label: pinyin, English, stroke count, clipped to the space left of the strip.
        $parts = [];
        if ($o->pinyin && $item->pinyin) {
            $parts[] = ['B', 10, 20, $item->pinyin];
        }
        if ($o->english && $item->english) {
            $parts[] = ['', 8, 90, $item->english];
        }
        $parts[] = ['', 7, 140, $n.($n === 1 ? ' stroke' : ' strokes')];
        $x = $left;
        $max = $sx - 2;
        foreach ($parts as [$style, $size, $grey, $text]) {
            $avail = $max - $x;
            if ($avail < 8) {
                break;
            }
            $pdf->SetFont('dejavusans', $style, $size);
            $pdf->SetTextColor($grey, $grey, $grey);
            $text = $this->fit($pdf, $text, $avail - 2.5);
            $w = $pdf->GetStringWidth($text) + 2.5;
            $pdf->SetXY($x, $y + 1);
            $pdf->Cell($w, 5.5, $text, 0, 0, 'L', false, '', 0, false, 'T', 'B');
            $x += $w;
        }

        // Practice squares: model, tracing copies, then empty.
        $cy = $y + self::HEAD;
        for ($i = 0; $i < WorksheetOptions::CELLS; $i++) {
            $cx = $left + $i * self::CELL;
            $this->cell($pdf, $cx, $cy, $o->grid);
            if ($i <= $o->trace) {
                $shade = $i === 0 ? 25 : 200;
                $pdf->SetFillColor($shade, $shade, $shade);
                $pdf->glyph($item->strokes, $cx + 0.9, $cy + 0.9, self::CELL - 1.8);
            }
        }
    }

    private function cell(WorksheetDocument $pdf, float $x, float $y, string $grid): void
    {
        $c = self::CELL;
        if ($grid !== 'plain') {
            $pdf->SetLineStyle(['width' => 0.15, 'dash' => '1,1', 'color' => [220, 165, 165]]);
            $pdf->Line($x + $c / 2, $y, $x + $c / 2, $y + $c);
            $pdf->Line($x, $y + $c / 2, $x + $c, $y + $c / 2);
            if ($grid === 'mi') {
                $pdf->Line($x, $y, $x + $c, $y + $c);
                $pdf->Line($x + $c, $y, $x, $y + $c);
            }
        }
        $pdf->SetLineStyle(['width' => 0.3, 'dash' => 0, 'color' => [200, 90, 90]]);
        $pdf->Rect($x, $y, $c, $c);
    }

    private function fit(WorksheetDocument $pdf, string $text, float $avail): string
    {
        if ($pdf->GetStringWidth($text) <= $avail) {
            return $text;
        }
        while (mb_strlen($text) > 1 && $pdf->GetStringWidth($text.'…') > $avail) {
            $text = mb_substr($text, 0, -1);
        }

        return rtrim($text, ' ,;').'…';
    }
}
