@extends('layouts.app')
@php
  $icon = [
    'hint' => '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/>',
    'outline' => '<rect x="4" y="4" width="16" height="16" rx="3" stroke-dasharray="3 3"/><path d="M9 9h6v6H9z"/>',
    'retry' => '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    'next' => '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'audio' => '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  ];
  $svg = fn ($k) => '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'.$icon[$k].'</svg>';
  $hasSource = ! empty($params['lesson']) || ! empty($params['version']) || in_array($params['source'] ?? null, ['saved', 'due'], true);
@endphp
@section('title', 'Practice')
@push('head')<link rel="stylesheet" href="/css/practice.css">@endpush

@section('content')
<div class="pr" data-practice @if($hasSource) data-has-source @endif data-mode="{{ ($params['mode'] ?? '') === 'dictation' ? 'dictation' : 'write' }}">
  <header class="pr-head">
    <span class="pr-kicker">Practice</span>
    <h1 class="pr-title" data-title>Write the characters</h1>
  </header>

  {{-- Source picker --}}
  <section class="pr-picker" data-picker @if($hasSource) hidden @endif aria-label="Choose what to practise">
    <div class="pr-group">
      <h2 class="pr-h2">Saved &amp; due</h2>
      <x-action-row icon="🔖" title="My saved words" sub="Characters from words you saved" :href="route('practice', ['source' => 'saved'])" />
      <x-action-row icon="⏰" title="Due cards" sub="Characters from cards due for review" :href="route('practice', ['source' => 'due'])" />
    </div>
    <div class="pr-group">
      <h2 class="pr-h2">A lesson</h2>
      <div class="pr-chips">
        @foreach ($lessons as $l)
          <x-chip :href="route('practice', ['lesson' => $l->slug])">Lesson {{ $l->number }} <span class="zh" lang="zh-Hans">{{ $l->zh_title }}</span></x-chip>
        @endforeach
      </div>
    </div>
    <div class="pr-group">
      <h2 class="pr-h2">HSK 2.0 level</h2>
      <div class="pr-chips">
        @foreach ($levels2 as $lv)<x-chip :href="route('practice', ['version' => 2, 'level' => $lv])">Level {{ $lv }}</x-chip>@endforeach
      </div>
      <h2 class="pr-h2">HSK 3.0 level</h2>
      <div class="pr-chips">
        @foreach ($levels3 as $lv)<x-chip :href="route('practice', ['version' => 3, 'level' => $lv])">Level {{ $lv === 7 ? '7–9' : $lv }}</x-chip>@endforeach
      </div>
      <p class="pr-note">For a 15-word set, open a level in <a href="{{ route('courses') }}">Courses</a> and choose Practise.</p>
    </div>
  </section>

  <p class="pr-msg" data-msg role="status" hidden></p>

  {{-- Session --}}
  <section class="pr-session" data-session hidden aria-label="Practice session">
    <div class="pr-top">
      <div class="pr-pill" role="group" aria-label="Mode">
        <button type="button" data-set-mode="write" aria-pressed="true">Write</button>
        <button type="button" data-set-mode="dictation" aria-pressed="false">Dictation</button>
      </div>
      <span class="pr-count" data-count aria-live="polite"></span>
    </div>
    <div class="pr-bar" role="progressbar" aria-label="Session progress" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0"><i data-bar></i></div>
    <ul class="pr-done" data-done aria-label="Characters"></ul>

    <div class="pr-card">
      <div class="pr-prompt">
        <div class="pr-prompt-text">
          <span class="pr-py" data-py></span>
          <span class="pr-en" data-en></span>
        </div>
        <button type="button" class="pr-audio" data-action="audio" aria-label="Play audio">{!! $svg('audio') !!}</button>
      </div>
      <div class="pr-stage"><x-writing-grid char="" mode="write" grid="mi" /></div>
      <p class="pr-feedback" role="status" data-feedback></p>
      <div class="pr-controls">
        <button type="button" class="pr-ctl" data-action="hint"><span class="pr-ctl-i">{!! $svg('hint') !!}</span>Hint</button>
        <button type="button" class="pr-ctl" data-action="outline" aria-pressed="true"><span class="pr-ctl-i">{!! $svg('outline') !!}</span>Outline</button>
        <button type="button" class="pr-ctl" data-action="retry"><span class="pr-ctl-i">{!! $svg('retry') !!}</span>Retry</button>
        <button type="button" class="pr-ctl is-primary" data-action="next"><span class="pr-ctl-i">{!! $svg('next') !!}</span><span data-next-label>Next</span></button>
      </div>
    </div>
  </section>

  {{-- Summary --}}
  <section class="pr-summary" data-summary hidden aria-labelledby="pr-sum-h">
    <h2 id="pr-sum-h" class="pr-h2">Session complete</h2>
    <div class="pr-stats">
      <x-stat-card value="0" label="Characters written" tone="green" data-stat="done" />
      <x-stat-card value="0" label="Mistakes" tone="red" data-stat="mistakes" />
      <x-stat-card value="0%" label="Stroke accuracy" tone="gold" data-stat="accuracy" />
    </div>
    <p class="pr-note" data-skipped hidden></p>
    <x-action-row variant="dark" icon="🧠" title="Review flashcards" sub="Keep it fresh with spaced repetition" :href="route('review')" />
    <x-action-row icon="✍️" title="Back to Practice" sub="Pick another source" :href="route('practice')" />
    <button type="button" class="pr-btn" data-action="again">Practise this set again</button>
  </section>
</div>
@endsection

@push('scripts')
<script src="/js/store.js"></script>
<script src="https://cdn.jsdelivr.net/npm/hanzi-writer@3.7.2/dist/hanzi-writer.min.js"></script>
<script src="/js/character.js"></script>
<script src="/js/practice.js"></script>
@endpush
