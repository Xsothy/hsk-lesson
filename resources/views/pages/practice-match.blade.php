@extends('layouts.app')
{{-- F4 · Pinyin match (canvas board "Match"): a board of pinyin slots and a tray of character stickers.
     Tap a sticker, then the slot with its pinyin. Deck: /data/review-deck, or a textbook list from the store. --}}
@section('title', 'Pinyin match')
@push('head')<link rel="stylesheet" href="/css/practice.css"><link rel="stylesheet" href="/css/match.css">@endpush

@php
  $src = $params['source'] ?? null;
  $first = $lessons->first();
  $cur = $lessons->firstWhere('slug', $params['lesson'] ?? null) ?? $first;
  // Without a source the board comes from the first lesson, like the canvas.
  if (empty($params['lesson']) && empty($params['version']) && ! in_array($src, ['saved', 'list'], true) && $first) {
    $params['lesson'] = $first->slug;
  }
  $isLesson = ! empty($params['lesson']);
  $isHsk = ! empty($params['version']);
@endphp
@section('content')
<div class="mt" data-match data-deck-url="/data/review-deck" data-has-source
  @foreach (['lesson', 'version', 'level', 'set', 'source', 'id'] as $k) @if(! empty($params[$k])) data-q-{{ $k }}="{{ $params[$k] }}" @endif @endforeach>
  <div class="mt-head">
    <div class="mt-titles">
      <h1>Pinyin match <span lang="zh-Hans">配对</span></h1>
      <p>Tap a character, then tap its pinyin. Board from <span data-source-label>{{ $isLesson && $cur ? $cur->label : ($isHsk ? 'HSK '.($params['level'] ?? 1) : ($src === 'saved' ? 'my words' : 'your list')) }}</span>.</p>
    </div>
    <div class="mt-score">
      <span data-score aria-live="polite">0 / 0</span>
      <button type="button" class="pr-btn" data-action="new">New board</button>
    </div>
  </div>

  <p class="pr-msg" data-msg role="status" hidden></p>

  <section class="mt-slots" data-board aria-label="Pinyin slots" hidden></section>

  <section class="mt-tray-wrap" data-session hidden aria-labelledby="mt-tray-l">
    <span class="mt-l" id="mt-tray-l">Stickers</span>
    <div class="mt-tray" data-tray></div>
    <p class="mt-status" role="status" data-feedback>Pick a sticker.</p>
  </section>

  <section class="mt-from" aria-labelledby="mt-from-l">
    <span class="mt-from-l" id="mt-from-l">New board from:</span>
    @if ($cur)
      <a class="mt-src" href="{{ route('practice.match', ['lesson' => $cur->slug]) }}" aria-pressed="{{ $isLesson ? 'true' : 'false' }}" role="button">Lesson {{ $cur->number }}</a>
    @endif
    @foreach ([2, 3] as $v)
      <a class="mt-src hsk-v{{ $v }}" href="{{ route('practice.match', ['version' => $v, 'level' => 1]) }}" aria-pressed="{{ $isHsk && (int) $params['version'] === $v && (int) ($params['level'] ?? 1) === 1 ? 'true' : 'false' }}" role="button">Random HSK 1</a>
    @endforeach
    <a class="mt-src" href="{{ route('practice.match', ['source' => 'saved']) }}" aria-pressed="{{ $src === 'saved' ? 'true' : 'false' }}" role="button">My words</a>
    <span data-lists class="mt-lists"></span>
    <label class="mt-more">
      <span class="pr-sr">Another lesson or level</span>
      <select class="pr-select" data-more>
        <option value="">Another lesson or level…</option>
        <optgroup label="Lessons">
          @foreach ($lessons as $l)
            <option class="hsk-v{{ ($l->course ?? '2.0') === '3.0' ? 3 : 2 }}" value="{{ route('practice.match', ['lesson' => $l->slug]) }}">{{ $l->label }} · {{ $l->zh_title }}</option>
          @endforeach
        </optgroup>
        <optgroup label="HSK 2.0">@foreach ($levels2 as $lv)<option value="{{ route('practice.match', ['version' => 2, 'level' => $lv]) }}">HSK 2.0 · Level {{ $lv }}</option>@endforeach</optgroup>
        <optgroup label="HSK 3.0">@foreach ($levels3 as $lv)<option value="{{ route('practice.match', ['version' => 3, 'level' => $lv]) }}">HSK 3.0 · Level {{ $lv === 7 ? '7–9' : $lv }}</option>@endforeach</optgroup>
      </select>
    </label>
  </section>
</div>
@endsection

@push('scripts')
<script src="/js/store.js"></script>
<script src="/js/pinyin-tones.js"></script>
<script src="/js/match.js"></script>
@endpush
