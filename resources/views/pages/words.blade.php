@extends('layouts.app')
@section('title', 'My words')
@push('head')<link rel="stylesheet" href="/css/words.css">@endpush
@section('content')
<div class="words-page" data-words-page>
  <div class="mw-head">
    <h1>My words <span lang="zh-Hans">生词本</span></h1>
    <a href="{{ route('settings') }}">Saved on this device · sync in Settings</a>
  </div>

  <div class="words-stats" aria-label="Your progress">
    <x-stat-card value="0" label="words known" data-stat="known" />
    <x-stat-card value="0" label="characters written" data-stat="written" />
    <x-stat-card value="0" label="due today" tone="red" data-stat="due" />
    <x-stat-card value="0" label="day streak" tone="gold" data-stat="streak" />
  </div>

  <section class="words-week" aria-labelledby="week-h">
    <div class="mw-week-top"><h2 id="week-h">This week</h2><span>items practised per day</span></div>
    <div data-week></div>
  </section>

  <div class="words-empty" data-empty hidden>
    <p class="words-empty-zh zh" aria-hidden="true">词</p>
    <h2>No saved words yet</h2>
    <p>Open any character and tap <strong>Save word</strong> — it will show up here for practice and review.</p>
    <a class="btn" href="{{ route('browse') }}">Browse characters</a>
  </div>

  <section class="mw-list" data-main hidden aria-label="Saved words">
    <div class="words-chips" role="group" aria-label="Filter saved words" data-chips></div>
    <div class="words-actions">
      <a class="btn btn-primary" href="/practice?source=saved" data-act="write">Write these</a>
      <a class="btn" href="/review?source=saved" data-act="cards">Flashcards</a>
      <a class="btn" href="/worksheet?source=text" data-act="sheet">Worksheet</a>
      <button type="button" class="btn" data-act="csv">Export CSV</button>
      <button type="button" class="btn" data-act="pdf">Export PDF</button>
    </div>
    <p class="words-count" data-count aria-live="polite"></p>
    <div class="words-list" data-list></div>
  </section>
</div>
<form method="POST" action="{{ route('words.pdf') }}" target="_blank" data-pdf-form hidden>@csrf</form>
<template id="tpl-chip"><x-chip :button="true">x</x-chip></template>
<template id="tpl-row">
  <div class="words-item">
    <x-word-row :word="['hanzi' => '', 'pinyin' => '', 'english' => '']" />
    <button type="button" class="words-unsave" data-unsave><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
  </div>
</template>
@endsection
@push('scripts')
<script src="/js/store.js"></script>
<script src="/js/words.js"></script>
@endpush
