@extends('layouts.app')
@section('title', ['pinyin' => 'Pinyin converter', 'hsk' => 'HSK level checker', 'name' => 'Chinese name', 'zodiac' => 'Zodiac'][$tab] . ' · Tools')
@push('head')<meta name="csrf-token" content="{{ csrf_token() }}"><link rel="stylesheet" href="/css/tools.css">@endpush
@php
$tabs = [
  'pinyin' => ['Pinyin converter', 'text → pinyin', route('tools.pinyin')],
  'hsk' => ['HSK level checker', 'how hard is this?', route('tools.hsk')],
  'name' => ['Chinese name', 'meaningful names', route('tools.name')],
  'zodiac' => ['Zodiac', 'your animal sign', route('tools.zodiac')],
];
@endphp
@section('content')
<div class="tl" data-tools data-tab="{{ $tab }}">
  <h1 class="tl-h1">Tools <span class="zh" lang="zh-Hans">工具</span></h1>

  <div class="tl-tabs" role="tablist" aria-label="Text tools">
    @foreach ($tabs as $k => [$label, $sub, $href])
      <a class="tl-tab" role="tab" id="tl-tab-{{ $k }}" href="{{ $href }}" data-tab-link="{{ $k }}" aria-controls="tl-p-{{ $k }}"
         aria-selected="{{ $tab === $k ? 'true' : 'false' }}" tabindex="{{ $tab === $k ? '0' : '-1' }}"><b>{{ $label }}</b><span>{{ $sub }}</span></a>
    @endforeach
  </div>

  {{-- Pinyin converter --}}
  <div class="tl-panel tl-split" role="tabpanel" id="tl-p-pinyin" aria-labelledby="tl-tab-pinyin" data-tool="pinyin" data-url="{{ url('/tools/pinyin') }}" @if ($tab !== 'pinyin') hidden @endif>
    <section class="tl-card tl-in">
      <label class="tl-lbl" for="pin-in">Chinese text</label>
      <textarea id="pin-in" class="tl-area zh" maxlength="{{ $maxPinyin }}" lang="zh-Hans" placeholder="你好！今天天气怎么样？ · xue2xi2"></textarea>
      <div class="tl-row">
        <button type="button" class="tl-btn tl-primary" data-run>Convert</button>
        <select class="tl-select" id="pin-mode" aria-label="Output style">
          <option value="ruby">Pinyin over characters</option>
          <option value="marks">Pinyin only</option>
          <option value="numbers">Tone numbers (ni3)</option>
          <option value="plain">No tones</option>
        </select>
      </div>
    </section>
    <section class="tl-card tl-out" aria-labelledby="pin-res-h">
      <div class="tl-out-head"><h2 id="pin-res-h">Result</h2><button type="button" class="tl-btn tl-ghost tl-sm" data-copy>Copy</button></div>
      <div class="tl-ruby" data-ruby lang="zh-Hans" aria-live="polite" hidden></div>
      <output id="pin-out" class="tl-text" data-out aria-live="polite" lang="zh"></output>
      <p class="tl-empty" data-empty>Type or paste Chinese text, then press Convert.</p>
      <p class="tl-note" data-status role="status"></p>
      <div class="tl-stats" data-stats hidden>
        <div><b data-st="chars">0</b><span>characters</span></div>
        <div><b data-st="avg">–</b><span>avg HSK</span></div>
        <div><b data-st="l1">0%</b><span>HSK 1</span></div>
        <div><b data-st="new">0</b><span>new to you</span></div>
      </div>
      <a class="tl-link" href="{{ route('worksheet') }}" data-worksheet>Make a worksheet from this text</a>
    </section>
  </div>

  {{-- HSK level checker --}}
  <section class="tl-panel tl-card tl-stack" role="tabpanel" id="tl-p-hsk" aria-labelledby="tl-tab-hsk" data-tool="hsk" data-url="{{ url('/tools/hsk-check') }}" @if ($tab !== 'hsk') hidden @endif>
    <textarea id="hsk-in" class="tl-area tl-area-s zh" aria-label="Text to check" maxlength="{{ $maxHsk }}" lang="zh-Hans" placeholder="我今天学习汉语。"></textarea>
    <div class="tl-pills" role="group" aria-label="HSK version">
      <button type="button" class="tl-pill" data-version="2.0" aria-pressed="true">HSK 2.0</button>
      <button type="button" class="tl-pill" data-version="3.0" aria-pressed="false">HSK 3.0 (read · write)</button>
    </div>
    <p class="tl-note" data-status role="status"></p>
    <div class="tl-words" data-words></div>
    <div class="tl-dist" data-dist></div>
  </section>

  {{-- Chinese name --}}
  <div class="tl-panel tl-stack-l" role="tabpanel" id="tl-p-name" aria-labelledby="tl-tab-name" data-tool="name" data-url="{{ url('/tools/name') }}" @if ($tab !== 'name') hidden @endif>
    <section class="tl-card tl-name">
      <div class="tl-name-form">
        <span class="tl-lbl" id="nm-style-l">Style</span>
        <div class="tl-pills" role="group" aria-labelledby="nm-style-l">
          <button type="button" class="tl-pill" data-style="balanced" aria-pressed="true">Balanced</button>
          <button type="button" class="tl-pill" data-style="modern" aria-pressed="false">Modern</button>
          <button type="button" class="tl-pill" data-style="easy" aria-pressed="false">Easy to write</button>
        </div>
        <span class="tl-lbl" id="nm-mean-l">Meaning (pick 2–3)</span>
        <div class="tl-pills" role="group" aria-labelledby="nm-mean-l">
          @foreach ($themes as $t)<button type="button" class="tl-pill tl-pick" data-theme="{{ $t }}" aria-pressed="false">{{ $t }}</button>@endforeach
        </div>
        <button type="button" class="tl-btn tl-primary" data-ideas>Suggest names</button>
        <p class="tl-note" data-ideas-status role="status"></p>
      </div>
      <div class="tl-names" data-names aria-live="polite"></div>
    </section>

    <section class="tl-card tl-stack" aria-labelledby="nm-sa-h">
      <h2 class="tl-h2" id="nm-sa-h">From your English name</h2>
      <p class="tl-fun">For fun only: a sound-alike name, not an official or traditional one. Real Chinese names are chosen with care for meaning, family and tone.</p>
      <label class="tl-lbl" for="nm-in">Your English name</label>
      <div class="tl-row">
        <input id="nm-in" class="tl-input" type="text" maxlength="60" autocomplete="off" placeholder="e.g. Emma">
        <button type="button" class="tl-btn tl-primary" data-run>Suggest</button>
      </div>
      <div data-result hidden>
        <p class="tl-big zh" data-name lang="zh-Hans"></p>
        <p class="tl-note" data-pinyin></p>
        <p class="tl-note">Tap a syllable to try another character.</p>
        <div class="tl-syl" data-syl></div>
      </div>
    </section>
  </div>

  {{-- Zodiac --}}
  <section class="tl-panel tl-card tl-zodiac" role="tabpanel" id="tl-p-zodiac" aria-labelledby="tl-tab-zodiac" data-tool="zodiac" data-url="{{ url('/tools/zodiac') }}" @if ($tab !== 'zodiac') hidden @endif>
    <label class="tl-date">Birth date <input id="zd-in" class="tl-input" type="date" min="1900-01-01" max="2100-12-31"></label>
    <div class="tl-sign" data-result>
      <span class="tl-sign-zh zh" data-big lang="zh-Hans" aria-hidden="true">？</span>
      <span class="tl-sign-text">
        <b data-title>Choose your birth date</b>
        <span data-text>The zodiac year starts at Chinese New Year, not on 1 January. Dates 1900–2100.</span>
        <a data-learn href="#" hidden></a>
      </span>
    </div>
    <p class="tl-note tl-zd-note" data-note role="status"></p>
  </section>
</div>
@endsection
@push('scripts')<script src="/js/store.js"></script><script src="/js/pinyin-tones.js"></script><script src="/js/tools.js"></script>@endpush
