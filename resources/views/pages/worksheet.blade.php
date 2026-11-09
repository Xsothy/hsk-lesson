@extends('layouts.app')
@section('title', 'Worksheet')
@push('head')<link rel="stylesheet" href="/css/practice.css"><link rel="stylesheet" href="/css/worksheet.css">@endpush
@section('content')
@php
  $src = old('source', $source);
  $v = (int) old('version', $pre['version'] ?? 2);
  $lv = (int) old('level', $pre['level'] ?? 1);
  $han = fn ($l) => implode('', array_unique(preg_split('//u', preg_replace('/[^\p{Han}]/u', '', implode('', array_filter((array) $l->vocab, 'is_string'))), -1, PREG_SPLIT_NO_EMPTY)));
  $pick = match ($src) {
    'lesson' => 'lesson:'.old('lesson', $pre['lesson'] ?? ($lessons->first()->slug ?? '')),
    'hsk' => 'hsk:'.$v.':'.$lv,
    default => 'text',
  };
  if ($src === 'text' && ! old('chars', $pre['chars'] ?? '') && $lessons->first()) { $pick = 'lesson:'.$lessons->first()->slug; }
  $trace = (int) old('trace', 4);
@endphp
<div class="ws" data-tool="worksheet">
  <div class="wk-head">
    <h1>Print a worksheet <span lang="zh-Hans">练习纸</span></h1>
    <p>Free and unlimited. Start from a lesson, an HSK list or your own characters.</p>
  </div>

  @if ($errors->any())
    <p class="pr-msg" role="alert">{{ $errors->first() }}</p>
  @endif

  <div class="ws-cols">
    <form class="ws-set" method="get" action="{{ route('worksheet.pdf') }}" target="_blank" data-worksheet-form>
      <input type="hidden" name="form" value="1">
      <input type="hidden" name="source" value="{{ $src }}" data-f="source">
      <input type="hidden" name="lesson" value="" data-f="lesson" disabled>
      <input type="hidden" name="version" value="" data-f="version" disabled>
      <input type="hidden" name="level" value="" data-f="level" disabled>
      <input type="hidden" name="english" value="1" data-f="english">

      <div class="ws-field">
        <label for="ws-src" class="ws-l">Start from</label>
        <select id="ws-src" class="ws-select" data-pick>
          <optgroup label="Lessons">
            @foreach ($lessons as $l)
              <option class="hsk-v{{ ($l->course ?? '2.0') === '3.0' ? 3 : 2 }}" value="lesson:{{ $l->slug }}" data-chars="{{ $han($l) }}" data-title="{{ $l->zh_title }} · {{ $l->label }}" @selected($pick === 'lesson:'.$l->slug)>{{ $l->label }} · {{ $l->zh_title }}</option>
            @endforeach
          </optgroup>
          @foreach ($levels as $ver => $items)
            <optgroup label="HSK {{ $ver }}.0" class="hsk-v{{ $ver }}">
              @foreach ($items as $it)
                <option value="hsk:{{ $ver }}:{{ $it['level'] }}" data-title="HSK {{ $ver }}.0 · Level {{ $it['label'] }}" @selected($pick === 'hsk:'.$ver.':'.$it['level'])>HSK {{ $it['label'] }} ({{ $ver }}.0)</option>
              @endforeach
            </optgroup>
          @endforeach
          <option value="saved" data-title="My saved words">My saved words</option>
          <option value="text" data-title="Character practice" @selected($pick === 'text')>Type my own</option>
        </select>
      </div>

      <div class="ws-field">
        <label for="ws-chars" class="ws-l">Characters</label>
        <textarea id="ws-chars" name="chars" class="wk-chars" rows="2" maxlength="500" lang="zh-Hans" placeholder="你好学习中文">{{ old('chars', $pre['chars'] ?? '') }}</textarea>
        <span class="ws-hint" data-count>0 characters · up to {{ $max }} per sheet</span>
      </div>

      <div class="ws-field">
        <span class="ws-l" id="ws-grid-l">Grid</span>
        <div class="ws-opts" role="radiogroup" aria-labelledby="ws-grid-l">
          @foreach (['tian' => 'Tian 田', 'mi' => 'Mi 米', 'plain' => 'Square'] as $val => $label)
            <label class="ws-opt"><input type="radio" name="grid" value="{{ $val }}" @checked(old('grid', 'tian') === $val)><b>{{ $label }}</b></label>
          @endforeach
        </div>
      </div>

      <div class="ws-field">
        <span class="ws-l" id="ws-mode-l">Practice mode</span>
        <div class="ws-opts" role="radiogroup" aria-labelledby="ws-mode-l">
          @foreach ([11 => ['Tracing', 'all grey'], 4 => ['Progressive', '1 + 4 grey'], 0 => ['Writing', 'model only']] as $val => [$label, $sub])
            <label class="ws-opt ws-mode"><input type="radio" name="trace" value="{{ $val }}" @checked($trace === $val || ($val === 4 && ! in_array($trace, [0, 4, 11], true)))><b>{{ $label }}</b><span>{{ $sub }}</span></label>
          @endforeach
        </div>
      </div>

      <div class="ws-checks">
        <label class="rv-check ws-check">Show pinyin &amp; meaning <input type="checkbox" name="pinyin" value="1" @checked(old('pinyin', '1'))></label>
        <label class="rv-check ws-check">Stroke-order strip <input type="checkbox" name="strip" value="1" @checked(old('strip', '1'))></label>
      </div>

      <button type="submit" class="ws-go">Open printable sheet</button>
      <p class="ws-hint">Opens a PDF in a new tab. Stroke data from <a href="https://github.com/skishore/makemeahanzi">Make Me a Hanzi</a>.</p>
    </form>

    <section class="ws-prev" aria-labelledby="ws-prev-h">
      <div class="ws-prev-top"><h2 id="ws-prev-h">Preview</h2><span data-pages>A4 · page 1 of 1</span></div>
      <div class="ws-paper" data-paper>
        <div class="ws-paper-h"><b lang="zh-Hans" data-ptitle>Character practice</b><span>Name ____________</span></div>
        <div data-rows class="ws-rows"></div>
        <p class="ws-hint" data-empty>Type or choose some characters to see the sheet.</p>
      </div>
    </section>
  </div>
</div>
@endsection
@push('scripts')
<script src="/js/store.js"></script>
<script src="/js/worksheet.js"></script>
@endpush
