<?php

namespace App\Http\Controllers;

use App\Models\Lesson;
use App\Services\Worksheet\WorksheetOptions;
use App\Services\Worksheet\WorksheetPdf;
use App\Services\Worksheet\WorksheetSource;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** F2 · Worksheet PDF: a builder page and a GET endpoint returning the PDF (shareable links). */
class WorksheetController extends Controller
{
    public function __construct(private WorksheetSource $source) {}

    /** GET /worksheet  (?lesson= | ?chars= | ?version=&level=[&set=] prefill the form) */
    public function index(Request $request)
    {
        $levels = [];
        foreach ([2, 3] as $v) {
            foreach (LearnController::levels($v) as $l) {
                $levels[$v][] = ['level' => $l, 'label' => LearnController::levelLabel($v, $l)];
            }
        }
        $pre = $request->only(['lesson', 'chars', 'version', 'level', 'set']);
        $source = $request->query('source') ?? match (true) {
            isset($pre['lesson']) => 'lesson',
            isset($pre['level']) => 'hsk',
            default => 'text',
        };

        return view('pages.worksheet', [
            'lessons' => Lesson::where('is_published', true)->orderBy('number')->get(['slug', 'number', 'course', 'title', 'en_title']),
            'levels' => $levels,
            'pre' => $pre,
            'source' => $source,
            'max' => WorksheetSource::MAX_CHARS,
        ]);
    }

    /** GET /worksheet.pdf?source=lesson|hsk|text&…&grid=tian|mi|plain&trace=0-11&pinyin=0|1&english=0|1 */
    public function pdf(Request $request, WorksheetPdf $renderer): Response
    {
        $in = $request->validate([
            'source' => ['required', Rule::in(['lesson', 'hsk', 'text'])],
            'lesson' => ['required_if:source,lesson', 'nullable', 'string', 'max:100'],
            'version' => ['required_if:source,hsk', 'nullable', 'integer', Rule::in([2, 3])],
            'level' => ['required_if:source,hsk', 'nullable', 'integer', 'min:1', 'max:9'],
            'set' => ['nullable', 'integer', 'min:1', 'max:500'],
            'chars' => ['required_if:source,text', 'nullable', 'string', 'max:500'],
            'grid' => ['nullable', Rule::in(WorksheetOptions::GRIDS)],
            'trace' => ['nullable', 'integer', 'min:0', 'max:'.(WorksheetOptions::CELLS - 1)],
            'pinyin' => ['nullable', 'boolean'],
            'english' => ['nullable', 'boolean'],
        ]);

        $picked = match ($in['source']) {
            'lesson' => $this->source->lesson($in['lesson']),
            'hsk' => $this->hsk((int) $in['version'], (int) $in['level'], isset($in['set']) ? (int) $in['set'] : null),
            'text' => ['title' => 'Character practice', 'chars' => WorksheetSource::hanzi($in['chars'])],
        };
        ['items' => $items] = $this->source->items($picked['chars']);
        if (! $items) {
            throw ValidationException::withMessages([
                $in['source'] === 'text' ? 'chars' : 'source' => 'No characters with stroke data found. Type Chinese characters, e.g. 你好.',
            ]);
        }

        // Unchecked checkboxes are absent from a GET form: treat absence as "off" when the form sent the flag.
        $options = WorksheetOptions::fromArray([
            'grid' => $in['grid'] ?? 'tian',
            'trace' => $in['trace'] ?? 3,
            'pinyin' => $request->has('form') ? $request->boolean('pinyin') : ($in['pinyin'] ?? true),
            'english' => $request->has('form') ? $request->boolean('english') : ($in['english'] ?? true),
        ]);
        $pdf = $renderer->render($picked['title'], $items, $options);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="worksheet.pdf"',
            'Cache-Control' => 'private, max-age=600',
        ]);
    }

    private function hsk(int $version, int $level, ?int $set): array
    {
        if (! in_array($level, LearnController::levels($version), true)) {
            throw ValidationException::withMessages(['level' => "HSK $version.0 has no level $level."]);
        }

        return $this->source->hsk($version, $level, $set);
    }
}
