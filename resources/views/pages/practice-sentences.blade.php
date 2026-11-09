@extends('layouts.app')
{{-- F7 · Sentence practice: build the Chinese sentence from its meaning, or pick the meaning of a Chinese sentence.
     Items come from /data/practice-queue?kind=sentences (lesson sentences, dialogue lines, grammar examples). --}}
@section('title', 'Sentence practice')
@push('head')<link rel="stylesheet" href="/css/practice.css"><link rel="stylesheet" href="/css/sentences.css">@endpush

@section('content')
<div class="pr sp" data-sentences data-lesson="{{ $lesson }}" data-mode="{{ $mode }}">
  <x-page-head eyebrow="Practice" title="Sentences" sub="Build sentences and match their meaning, from lesson sentences and dialogues." data-title />

  <nav class="sp-sources" aria-label="Choose lesson">
    <div class="pr-chips">
      <x-chip :href="route('practice.sentences', ['mode' => $mode])" :active="$lesson === ''">All lessons</x-chip>
      @foreach ($lessons as $l)
        <x-chip :href="route('practice.sentences', ['lesson' => $l->slug, 'mode' => $mode])" :active="$lesson === $l->slug">{{ $l->full_label }}</x-chip>
      @endforeach
    </div>
  </nav>

  <p class="pr-msg" data-msg role="status">Building your sentences…</p>

  <section class="pr-session" data-session hidden aria-label="Sentence practice session">
    <div class="pr-top">
      <div class="pr-pill" role="group" aria-label="Exercise">
        <button type="button" data-set-mode="mix" aria-pressed="{{ $mode === 'mix' ? 'true' : 'false' }}">Mixed</button>
        <button type="button" data-set-mode="build" aria-pressed="{{ $mode === 'build' ? 'true' : 'false' }}">Build</button>
        <button type="button" data-set-mode="meaning" aria-pressed="{{ $mode === 'meaning' ? 'true' : 'false' }}">Meaning</button>
      </div>
      <span class="pr-count" data-count aria-live="polite"></span>
    </div>
    <div class="pr-bar" role="progressbar" aria-label="Session progress" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0"><i data-bar></i></div>

    <div class="pr-card sp-card">
      <p class="sp-ask" data-ask></p>

      {{-- Build: English prompt, tap word tiles in order --}}
      <div class="sp-build" data-build hidden>
        <p class="sp-en" data-en></p>
        <div class="sp-answer" data-answer aria-label="Your sentence" aria-live="polite"></div>
        <div class="sp-tiles" data-tiles aria-label="Word tiles"></div>
      </div>

      {{-- Meaning: Chinese sentence (x-ruby-line), choose the English --}}
      <div class="sp-meaning" data-meaning hidden>
        <div class="sp-line" data-line></div>
        <div class="sp-choices" data-choices role="group" aria-label="Meanings"></div>
      </div>

      <div class="sp-reveal" data-reveal hidden></div>
      <p class="pr-feedback" role="status" data-feedback></p>
      <div class="sp-actions">
        <button type="button" class="pr-btn" data-action="clear"><x-icon name="repeat" :size="18" /> Clear</button>
        <button type="button" class="pr-btn is-primary" data-action="check">Check</button>
        <button type="button" class="pr-btn is-primary" data-action="next" hidden><span data-next-label>Next</span> <x-icon name="arrow-right" :size="18" /></button>
      </div>
    </div>
  </section>

  <section class="pr-summary" data-summary hidden aria-labelledby="sp-sum-h">
    <h2 id="sp-sum-h" class="pr-h2">Session complete</h2>
    <div class="pr-stats">
      <x-stat-card value="0" label="Correct" tone="green" data-stat="correct" />
      <x-stat-card value="0" label="Missed" tone="red" data-stat="missed" />
      <x-stat-card value="0%" label="Accuracy" tone="gold" data-stat="accuracy" />
    </div>
    <x-action-row icon="pen" title="Back to Practice" sub="Pick another source" :href="route('practice')" />
    <button type="button" class="pr-btn" data-action="again">Practise these sentences again</button>
  </section>
</div>
@endsection

@push('scripts')
<script src="/js/store.js"></script>
<script src="/js/ruby.js"></script>
<script src="/js/sentence-practice.js"></script>
@endpush
