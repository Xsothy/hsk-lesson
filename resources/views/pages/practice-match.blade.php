@extends('layouts.app')
{{-- F4 · Pinyin match: rounds of ~6 pairs, tap a character then its pinyin (or meaning). Deck: /data/review-deck, or a textbook list from the store. --}}
@section('title', 'Pinyin match')
@push('head')<link rel="stylesheet" href="/css/practice.css"><link rel="stylesheet" href="/css/match.css">@endpush

@php
  $src = $params['source'] ?? null;
  $hasSource = ! empty($params['lesson']) || ! empty($params['version']) || in_array($src, ['saved', 'list'], true);
@endphp
@section('content')
<div class="pr mt" data-match data-deck-url="/data/review-deck" @if($hasSource) data-has-source @endif>
  <x-page-head eyebrow="Practice" title="Pinyin match" sub="Tap a character, then its pinyin or meaning. Clear every round against the clock." />

  <section class="pr-picker" data-picker @if($hasSource) hidden @endif aria-label="Choose what to match">
    <div class="pr-group">
      <h2 class="pr-h2">My words</h2>
      <x-action-row icon="bookmark" title="My saved words" sub="Words you saved" :href="route('practice.match', ['source' => 'saved'])" />
      <div class="pr-chips" data-lists></div>
    </div>
    <div class="pr-group">
      <h2 class="pr-h2">A lesson</h2>
      <p class="muted hsk-v3">Our HSK 3.0 course is coming next. Switch to HSK 2.0 in <a href="{{ route('settings') }}#st-study">Settings</a> for our current lessons.</p>
      <div class="pr-chips pr-lessons">
        @foreach ($lessons as $l)
          <x-chip class="pr-lesson hsk-v{{ ($l->course ?? '2.0') === '3.0' ? 3 : 2 }}" :href="route('practice.match', ['lesson' => $l->slug])"><span class="pr-lesson-n">{{ $l->label }}</span> <span class="zh" lang="zh-Hans">{{ $l->zh_title }}</span></x-chip>
        @endforeach
      </div>
    </div>
    <div class="pr-group">
      <div class="hsk-v2">
      <h2 class="pr-h2">HSK 2.0 level</h2>
      <div class="pr-chips">@foreach ($levels2 as $lv)<x-chip :href="route('practice.match', ['version' => 2, 'level' => $lv])">Level {{ $lv }}</x-chip>@endforeach</div>
      </div>
      <div class="hsk-v3">
      <h2 class="pr-h2">HSK 3.0 level</h2>
      <div class="pr-chips">@foreach ($levels3 as $lv)<x-chip :href="route('practice.match', ['version' => 3, 'level' => $lv])">Level {{ $lv === 7 ? '7–9' : $lv }}</x-chip>@endforeach</div>
      </div>
    </div>
  </section>

  <p class="pr-msg" data-msg role="status" hidden></p>

  <section class="pr-session" data-session hidden aria-label="Pinyin match game">
    <div class="pr-top">
      <div class="pr-pill" role="group" aria-label="Match with">
        <button type="button" data-set-mode="pinyin" aria-pressed="true">Pinyin</button>
        <button type="button" data-set-mode="meaning" aria-pressed="false">Meaning</button>
      </div>
      <span class="pr-count" data-count aria-live="polite"></span>
    </div>
    <div class="mt-stats">
      <span class="mt-stat"><x-icon name="clock" :size="18" /> <b data-timer>0:00</b></span>
      <span class="mt-stat">Misses <b data-misses>0</b></span>
      <span class="mt-stat">Best <b data-best>–</b></span>
    </div>
    <div class="mt-board" data-board>
      <div class="mt-col" data-left role="group" aria-label="Characters"></div>
      <div class="mt-col" data-right role="group" aria-label="Answers"></div>
    </div>
    <p class="pr-feedback" role="status" data-feedback></p>
  </section>

  <section class="pr-summary" data-summary hidden aria-labelledby="mt-sum-h">
    <h2 id="mt-sum-h" class="pr-h2">All matched!</h2>
    <div class="pr-stats">
      <x-stat-card value="0" label="Score" tone="gold" data-stat="score" />
      <x-stat-card value="0:00" label="Time" tone="green" data-stat="time" />
      <x-stat-card value="0" label="Misses" tone="red" data-stat="misses" />
    </div>
    <p class="mt-best" data-best-note role="status"></p>
    <button type="button" class="pr-btn is-primary" data-action="again">Play again</button>
    <x-action-row icon="pen" title="Back to Practice" sub="Pick another source" :href="route('practice')" />
  </section>
</div>
@endsection

@push('scripts')
<script src="/js/store.js"></script>
<script src="/js/pinyin-tones.js"></script>
<script src="/js/match.js"></script>
@endpush
