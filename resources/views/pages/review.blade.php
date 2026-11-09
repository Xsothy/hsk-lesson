@extends('layouts.app')
@section('title', 'Review')
@push('head')<link rel="stylesheet" href="/css/practice.css"><link rel="stylesheet" href="/css/review.css">@endpush
@section('content')
<div id="rv" class="rv" data-deck-url="{{ url('/data/review-deck') }}">
  <h1 class="pr-sr" id="rv-h1">Review flashcards</h1>

  <section class="rv-main" aria-labelledby="rv-h1">
    {{-- Deck chooser: shown when no deck is named in the URL --}}
    <div id="rv-choose" class="rv-card rv-blank" hidden>
      <span class="rv-tag">FLASHCARDS</span>
      <span class="rv-hanzi zh" lang="zh-Hans" aria-hidden="true">复习</span>
      <p class="rv-hint" id="rv-summary">Pick a deck to start.</p>
      <a class="rv-reveal" id="rv-start" href="{{ route('review', ['source' => 'due']) }}" hidden>Review cards due</a>
    </div>

    {{-- Study session --}}
    <div id="rv-study" class="rv-study" hidden>
      <div class="rv-top">
        <span class="rv-count" id="rv-count" aria-live="polite"></span>
        <div class="rv-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Session progress"><i id="rv-bar-fill"></i></div>
        <span class="rv-title" id="rv-title"></span>
      </div>

      <div class="rv-card" id="rv-card" tabindex="-1" role="button" aria-label="Flip card">
        <span class="rv-tag" id="rv-tag"></span>
        <div class="rv-face rv-front" id="rv-front"></div>
        <div class="rv-face rv-back" id="rv-back" hidden></div>
        <span class="rv-hint" id="rv-hint">Say it out loud, then tap to reveal</span>
      </div>

      <button type="button" class="rv-reveal" id="rv-reveal">Show answer <kbd>Space</kbd></button>
      <div class="rv-rate" id="rv-rate" hidden>
        @foreach ([1 => ['Again', 'again'], 2 => ['Hard', 'hard'], 3 => ['Good', 'good'], 4 => ['Easy', 'easy']] as $n => [$label, $cls])
          <button type="button" class="rv-btn rv-{{ $cls }}" data-rating="{{ $n }}">
            <b class="rv-btn-l">{{ $label }}</b><span class="rv-btn-n" data-next="{{ $n }}"></span><kbd>{{ $n }}</kbd>
          </button>
        @endforeach
      </div>
      <div class="rv-links">
        <a id="rv-strokes" href="#">Strokes</a>
        <a id="rv-write" href="#">Write it now</a>
      </div>
    </div>

    {{-- Done --}}
    <div id="rv-done" class="rv-card rv-blank" hidden>
      <h2 class="pr-h2">Session complete</h2>
      <div class="stat-grid" id="rv-stats"></div>
      <p class="rv-hint" id="rv-done-note"></p>
      <div class="rv-done-actions">
        <a class="pr-btn is-primary" id="rv-again-link" href="{{ route('review', ['source' => 'due']) }}">Review again</a>
        <a class="pr-btn" href="{{ route('home') }}">Back to Today</a>
      </div>
    </div>

    <p class="rv-empty" id="rv-empty" hidden></p>
    <p class="rv-empty" id="rv-error" role="alert" hidden>Could not load this deck. <a href="">Try again</a></p>
  </section>

  <aside class="rv-side">
    <section class="rv-panel" aria-labelledby="rv-decks-h">
      <h2 id="rv-decks-h">Decks</h2>
      <a class="rv-deck" href="{{ route('review', ['source' => 'due']) }}" data-deck="due">
        <span class="rv-deck-t"><b>Cards due</b><span>All decks</span></span><span class="rv-due" data-due="due"></span>
      </a>
      <a class="rv-deck" href="{{ route('review', ['source' => 'saved']) }}" data-deck="saved">
        <span class="rv-deck-t"><b>Saved words</b><span data-size="saved"></span></span><span class="rv-due" data-due="saved"></span>
      </a>
      @foreach ([2, 3] as $v)
        <a class="rv-deck hsk-v{{ $v }}" href="{{ route('review', ['version' => $v, 'level' => 1]) }}" data-deck="hsk{{ $v }}-1">
          <span class="rv-deck-t"><b>HSK 1 ({{ $v }}.0)</b><span>{{ $hskSize[$v] }} words</span></span><span class="rv-due">New</span>
        </a>
      @endforeach
      <details class="rv-more" @if(request('lesson') || request('version')) open @endif>
        <summary>More decks</summary>
        @foreach ($lessons as $l)
          <a class="rv-deck hsk-v{{ ($l->course ?? '2.0') === '3.0' ? 3 : 2 }}" href="{{ route('review', ['lesson' => $l->slug]) }}" data-deck="{{ $l->slug }}" data-words="{{ implode(',', array_filter((array) $l->vocab, 'is_string')) }}">
            <span class="rv-deck-t"><b>Lesson {{ $l->number }} · {{ $l->en_title ?: $l->title }}</b><span>{{ count($l->vocab ?? []) }} words</span></span><span class="rv-due" data-due-lesson></span>
          </a>
        @endforeach
        @foreach ($levels as $v => $items)
          <div class="rv-levels hsk-v{{ $v }}">
            @foreach ($items as $it)
              <a class="rv-lv" href="{{ route('review', ['version' => $v, 'level' => $it['level']]) }}" data-deck="hsk{{ $v }}-{{ $it['level'] }}">HSK {{ $it['label'] }}</a>
            @endforeach
          </div>
        @endforeach
      </details>
      <button type="button" class="rv-new" id="rv-new-deck">New deck from saved words</button>
      <p class="rv-new-msg" id="rv-new-msg" role="status"></p>
    </section>

    <section class="rv-panel" aria-labelledby="rv-set-h">
      <h2 id="rv-set-h">Review settings</h2>
      <div class="rv-field">
        <span class="rv-field-l" id="rv-first-l">Show first</span>
        <div class="pr-seg" role="group" aria-labelledby="rv-first-l">
          <button type="button" data-first="zh" aria-pressed="true">Chinese</button>
          <button type="button" data-first="en" aria-pressed="false">English</button>
          <button type="button" data-first="audio" aria-pressed="false">Audio</button>
        </div>
      </div>
      <label class="rv-check">Pinyin on front <input type="checkbox" id="rv-pyfront"></label>
      <label class="rv-check">Play audio on reveal <input type="checkbox" id="rv-audio-reveal"></label>
      <label class="rv-sel">New cards per day
        <select id="rv-newday" class="pr-select">
          @foreach ([5, 10, 20, 30, 50] as $n)<option value="{{ $n }}">{{ $n }}</option>@endforeach
        </select>
      </label>
    </section>
  </aside>
</div>
@endsection
@push('scripts')<script src="/js/store.js"></script><script src="/js/review.js"></script>@endpush
