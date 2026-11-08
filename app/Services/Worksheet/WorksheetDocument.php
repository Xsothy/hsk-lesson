<?php

namespace App\Services\Worksheet;

use TCPDF;

/**
 * TCPDF with native vector drawing of Make Me a Hanzi stroke paths, so hanzi need no CJK font.
 * Paths live in a 1024 box with the y axis flipped around 900 (the dataset's own transform).
 */
class WorksheetDocument extends TCPDF
{
    public string $footerText = '';

    public function __construct(...$args)
    {
        parent::__construct(...$args);
        $this->tcpdflink = false; // no "Powered by TCPDF" line (the constructor resets it)
    }

    /** Fill strokes [$from, $to) of a glyph (all when $to is null) into a $size mm square at ($x, $y). */
    public function glyph(array $strokes, float $x, float $y, float $size, ?int $to = null, int $from = 0): void
    {
        $slice = array_slice($strokes, $from, $to === null ? null : max(0, $to - $from));
        foreach ($slice as $d) {
            $ops = $this->pathOps((string) $d, $x, $y, $size);
            if ($ops !== '') {
                $this->_out($ops.' f');
            }
        }
    }

    private function pathOps(string $d, float $x, float $y, float $size): string
    {
        preg_match_all('/[MLQCZ]|-?\d+(?:\.\d+)?/i', $d, $m);
        $t = $m[0];
        $n = count($t);
        $s = $size / 1024;
        $pt = fn (array $p) => sprintf('%.3F %.3F', ($x + $p[0] * $s) * $this->k, ($this->h - ($y + (900 - $p[1]) * $s)) * $this->k);
        $out = [];
        $cur = [0.0, 0.0];
        $cmd = '';
        $i = 0;
        $num = function () use (&$i, $t): float {
            return (float) ($t[$i++] ?? 0);
        };
        while ($i < $n) {
            if (ctype_alpha($t[$i])) {
                $cmd = strtoupper($t[$i++]);
            }
            switch ($cmd) {
                case 'M':
                case 'L':
                    $cur = [$num(), $num()];
                    $out[] = $pt($cur).($cmd === 'M' ? ' m' : ' l');
                    $cmd = 'L'; // numbers after a moveto are implicit linetos
                    break;
                case 'Q': // quadratic → cubic
                    $q = [$num(), $num()];
                    $p = [$num(), $num()];
                    $c1 = [$cur[0] + 2 / 3 * ($q[0] - $cur[0]), $cur[1] + 2 / 3 * ($q[1] - $cur[1])];
                    $c2 = [$p[0] + 2 / 3 * ($q[0] - $p[0]), $p[1] + 2 / 3 * ($q[1] - $p[1])];
                    $out[] = $pt($c1).' '.$pt($c2).' '.$pt($p).' c';
                    $cur = $p;
                    break;
                case 'C':
                    $c1 = [$num(), $num()];
                    $c2 = [$num(), $num()];
                    $cur = [$num(), $num()];
                    $out[] = $pt($c1).' '.$pt($c2).' '.$pt($cur).' c';
                    break;
                case 'Z':
                    $out[] = 'h';
                    $cmd = '';
                    break;
                default:
                    $i++; // stray token
            }
        }

        return implode("\n", $out);
    }

    public function Footer(): void
    {
        $this->SetY(-10);
        $this->SetFont('dejavusans', '', 7);
        $this->SetTextColor(140, 140, 140);
        // Page aliases are resolved after layout, so keep them left-aligned (right alignment drifts).
        $this->Cell(0, 5, 'Page '.$this->getAliasNumPage().' / '.$this->getAliasNbPages().'   ·   '.$this->footerText, 0, 0, 'L');
    }
}
