<?php

namespace App\Http\Controllers;

use App\Services\Worksheet\WordListPdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** F9 · POST /words/pdf: saved words live client-side, so the browser posts them and gets a PDF back. */
class WordsPdfController extends Controller
{
    public function __invoke(Request $request, WordListPdf $pdf): Response
    {
        $in = $request->validate([
            'words' => ['required', 'array', 'min:1', 'max:'.WordListPdf::MAX_WORDS],
            'words.*' => ['required', 'string', 'max:12', 'regex:/^\p{Han}+$/u'],
            'level' => ['nullable', 'boolean'],
        ]);
        $rows = $pdf->rows($in['words']);

        return response($pdf->render($rows, $request->boolean('level', true)), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="my-words.pdf"',
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
