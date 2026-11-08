<?php

namespace App\Services\Worksheet;

use App\Models\Character;
use App\Models\HskWord;

/** F9 · "My words" list PDF: hanzi, tone-marked pinyin, meaning, optional HSK level in a table. */
class WordListPdf
{
    public const MAX_WORDS = 200;

    /**
     * Looks words up (HSK words first, then single characters).
     *
     * @param  list<string>  $words
     * @return list<array{hanzi: string, pinyin: string, english: string, level: ?int}>
     */
    public function rows(array $words): array
    {
        $words = array_values(array_unique($words));
        $hsk = HskWord::whereIn('simplified', $words)->orderByRaw('frequency is null, frequency')->get()->unique('simplified')->keyBy('simplified');
        $chars = Character::whereIn('char', $words)->get()->keyBy('char');
        $rows = [];
        foreach ($words as $w) {
            $h = $hsk[$w] ?? null;
            $c = $chars[$w] ?? null;
            $rows[] = [
                'hanzi' => $w,
                'pinyin' => $h ? (string) $h->pinyin : implode(', ', array_slice($c->pinyin ?? [], 0, 2)),
                'english' => $h ? implode('; ', array_slice((array) $h->meanings, 0, 2)) : (string) ($c->definition ?? ''),
                'level' => $h ? ($h->hsk3_level ?: $h->hsk2_level) : ($c?->hsk3_level ?: $c?->hsk2_level),
            ];
        }

        return $rows;
    }

    /** @param list<array{hanzi: string, pinyin: string, english: string, level: ?int}> $rows */
    public function render(array $rows, bool $level = true): string
    {
        $pdf = new WorksheetDocument('P', 'mm', 'A4', true, 'UTF-8');
        $pdf->SetCreator(config('app.name'));
        $pdf->SetTitle('My words');
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(true);
        $pdf->footerText = count($rows).' words';
        $pdf->SetMargins(15, 15, 15);
        $pdf->SetAutoPageBreak(true, 16);
        $pdf->AddPage();
        // Hanzi use TCPDF's bundled CJK CID font (STSong-Light); Latin text uses bundled DejaVu Sans.
        $zh = 'stsongstdlight';
        $w = ['zh' => 28, 'py' => 42, 'lv' => $level ? 14 : 0];
        $w['en'] = 180 - array_sum($w);

        $pdf->SetFont('dejavusans', 'B', 15);
        $pdf->Cell(0, 9, 'My words', 0, 1);
        $head = function () use ($pdf, $w, $level) {
            $pdf->SetFont('dejavusans', 'B', 8);
            $pdf->SetFillColor(240, 240, 240);
            $pdf->SetTextColor(90, 90, 90);
            $pdf->Cell($w['zh'], 7, 'Hanzi', 'B', 0, 'L', true);
            $pdf->Cell($w['py'], 7, 'Pinyin', 'B', 0, 'L', true);
            $pdf->Cell($w['en'], 7, 'Meaning', 'B', 0, 'L', true);
            if ($level) {
                $pdf->Cell($w['lv'], 7, 'HSK', 'B', 0, 'L', true);
            }
            $pdf->Ln();
        };
        $head();
        foreach ($rows as $r) {
            if ($pdf->GetY() > 297 - 16 - 11) {
                $pdf->AddPage();
                $head();
            }
            $y = $pdf->GetY();
            $pdf->SetTextColor(20, 20, 20);
            $pdf->SetFont($zh, '', 16);
            $pdf->Cell($w['zh'], 10, $r['hanzi'], 'B', 0, 'L');
            $pdf->SetFont('dejavusans', '', 10);
            $pdf->Cell($w['py'], 10, $this->fit($pdf, $r['pinyin'], $w['py'] - 2), 'B', 0, 'L');
            $pdf->SetFont('dejavusans', '', 8.5);
            $pdf->SetTextColor(70, 70, 70);
            $pdf->Cell($w['en'], 10, $this->fit($pdf, $r['english'], $w['en'] - 2), 'B', 0, 'L');
            if ($level) {
                $pdf->Cell($w['lv'], 10, $r['level'] ? (string) $r['level'] : '', 'B', 0, 'L');
            }
            $pdf->SetXY(15, $y + 10);
        }

        return $pdf->Output('my-words.pdf', 'S');
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
