@extends('layouts.app')
@section('title', 'Settings')
@push('head')<link rel="stylesheet" href="/css/settings.css">@endpush
@php
$segs = [
  'pinyin' => ['Pinyin', ['show' => 'Show', 'hide' => 'Hide']],
  'pinyinPos' => ['Pinyin position', ['above' => 'Above', 'below' => 'Below']],
  'toneColors' => ['Tone colours', ['on' => 'On', 'off' => 'Off']],
  'charSize' => ['Character size', ['sm' => 'Small', 'md' => 'Medium', 'lg' => 'Large']],
  'theme' => ['Theme', ['light' => 'Light', 'dark' => 'Dark', 'system' => 'System']],
  'hskVersion' => ['HSK version', ['2.0' => 'HSK 2.0', '3.0' => 'HSK 3.0']],
];
@endphp
@section('content')
<h1>Settings</h1>
<p class="st-lead">Saved on this device and applied everywhere straight away.</p>

@php
$segment = function (string $n) use ($segs) {
    [$label, $opts] = $segs[$n];
    $html = '<fieldset class="st-row" data-seg="'.e($n).'"><legend>'.e($label).'</legend><div class="st-seg">';
    foreach ($opts as $val => $text) {
        $html .= '<label><input type="radio" name="'.e($n).'" value="'.e($val).'"><span>'.e($text).'</span></label>';
    }
    return new \Illuminate\Support\HtmlString($html.'</div></fieldset>');
};
@endphp

<section class="st-sec" aria-labelledby="st-display">
  <h2 id="st-display">Display</h2>
  <div class="st-card">
    @foreach (['pinyin', 'pinyinPos', 'toneColors', 'charSize', 'theme'] as $n){{ $segment($n) }}@endforeach
    <div class="st-preview" aria-label="Preview">
      <ruby>你<rt class="tone-3">nǐ</rt></ruby><ruby>好<rt class="tone-3">hǎo</rt></ruby>
      <span class="st-preview-en">Preview</span>
    </div>
  </div>
</section>

<section class="st-sec" aria-labelledby="st-audio">
  <h2 id="st-audio">Audio</h2>
  <div class="st-card">
    <div class="st-row">
      <label for="st-rate">Speech rate <output id="st-rate-out" for="st-rate"></output></label>
      <input id="st-rate" type="range" min="0.5" max="1.5" step="0.1">
    </div>
    <div class="st-row">
      <label for="st-voice">Voice</label>
      <select id="st-voice"><option value="">Automatic (best Chinese voice)</option></select>
      <p class="st-note" id="st-voice-note" hidden>No voices found on this device. Audio falls back to online speech.</p>
    </div>
    <div class="st-row"><div><button type="button" class="st-btn" id="st-test">▶ Play test: 你好</button></div></div>
  </div>
</section>

<section class="st-sec" aria-labelledby="st-study">
  <h2 id="st-study">Study</h2>
  <div class="st-card">
    {{ $segment('hskVersion') }}
    <div class="st-row">
      <label for="st-goal">Daily goal (characters)</label>
      <select id="st-goal">@foreach ([5, 10, 15, 20, 30, 50] as $n)<option value="{{ $n }}">{{ $n }} a day</option>@endforeach</select>
    </div>
    <div class="st-row">
      <label for="st-hint">Show a hint after</label>
      <select id="st-hint"><option value="0">Never</option>@foreach ([1, 2, 3, 4, 5] as $n)<option value="{{ $n }}">{{ $n }} {{ $n === 1 ? 'miss' : 'misses' }}</option>@endforeach</select>
    </div>
    <div class="st-row">
      <label for="st-rv-first">Flashcards show first</label>
      <select id="st-rv-first"><option value="zh">Chinese</option><option value="en">English</option><option value="audio">Audio</option></select>
    </div>
    <div class="st-row">
      <label for="st-rv-pinyin">Pinyin on the card front</label>
      <select id="st-rv-pinyin"><option value="off">Hidden</option><option value="on">Shown</option></select>
    </div>
    <div class="st-row">
      <label for="st-rv-audio">Play audio when a card is revealed</label>
      <select id="st-rv-audio"><option value="on">Yes</option><option value="off">No</option></select>
    </div>
  </div>
</section>

<section class="st-sec" aria-labelledby="st-data">
  <h2 id="st-data">Data</h2>
  <div class="st-card">
    <p class="st-note">Progress and settings live in this browser only. Export a backup to move them to another device.</p>
    <div class="st-actions">
      <button type="button" class="st-btn" id="st-export">Export JSON</button>
      <button type="button" class="st-btn" id="st-import">Import JSON…</button>
      <input type="file" id="st-file" accept="application/json,.json" hidden>
      <button type="button" class="st-btn st-danger" id="st-reset">Reset all data…</button>
    </div>
    <p class="st-status" id="st-status" role="status" aria-live="polite"></p>
    <div class="st-sync">
      <button type="button" class="st-btn" disabled>Sign in to sync</button>
      <span class="chip chip-gold">beta</span>
    </div>
  </div>
</section>

<dialog id="st-confirm" aria-labelledby="st-confirm-t">
  <form method="dialog">
    <h2 id="st-confirm-t">Reset all data?</h2>
    <p>This erases your progress, saved words, review schedule and settings on this device. It cannot be undone.</p>
    <div class="st-actions">
      <button class="st-btn" value="cancel" autofocus>Cancel</button>
      <button class="st-btn st-danger" value="reset" id="st-confirm-ok">Reset everything</button>
    </div>
  </form>
</dialog>
@endsection
@push('scripts')
<script src="/js/store.js"></script>
<script src="/js/settings-page.js"></script>
@endpush
