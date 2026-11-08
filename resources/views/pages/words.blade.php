@extends('layouts.app')
@section('title', 'My words')
@push('head')<link rel="stylesheet" href="/css/words.css">@endpush
@section('content')
<div class="words-page" data-words-page>
  <h1>My words</h1>

  <div class="words-stats" aria-label="Your progress">
    <x-stat-card value="0" label="Saved" tone="red" data-stat="saved" />
    <x-stat-card value="0" label="Known" tone="green" data-stat="known" />
    <x-stat-card value="0" label="Characters written" tone="blue" data-stat="written" />
    <x-stat-card value="0" label="Day streak" tone="gold" data-stat="streak" />
  </div>

  <section class="words-week" aria-labelledby="week-h">
    <h2 id="week-h">This week</h2>
    <div data-week></div>
  </section>

  <div class="words-empty" data-empty hidden>
    <p class="words-empty-zh zh" aria-hidden="true">词</p>
    <h2>No saved words yet</h2>
    <p>Open any character and tap <strong>Save word</strong> — it will show up here for practice and review.</p>
    <a class="btn" href="{{ route('browse') }}">Browse characters</a>
  </div>

  <div data-main hidden>
    <div class="words-actions">
      <a class="btn btn-primary" href="/practice?source=saved" data-act="write">Write</a>
      <a class="btn" href="/review?source=saved" data-act="cards">Flashcards</a>
      <button type="button" class="btn" data-act="csv">Export CSV</button>
    </div>
    <div class="words-chips" role="group" aria-label="Filter saved words" data-chips></div>
    <p class="words-count" data-count aria-live="polite"></p>
    <div class="words-list" data-list></div>
  </div>
</div>
<template id="tpl-chip"><x-chip :button="true">x</x-chip></template>
<template id="tpl-row">
  <div class="words-item">
    <x-word-row :word="['hanzi' => '', 'pinyin' => '', 'english' => '']" />
    <button type="button" class="words-unsave" data-unsave>×</button>
  </div>
</template>
@endsection
@push('scripts')
<script src="/js/store.js"></script>
<script src="/js/words.js"></script>
@endpush
