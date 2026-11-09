@extends('layouts.app')
{{-- F7 · Sentence practice: build the Chinese sentence from its meaning, or pick the meaning of a Chinese sentence.
     No canvas board: laid out like Practice (session column + "Session" setup aside, the Sentence mode tab active).
     Items come from /data/practice-queue?kind=sentences (lesson sentences, dialogue lines, grammar examples). --}}
@section('title', 'Sentence practice')
@push('head')<link rel="stylesheet" href="/css/practice.css"><link rel="stylesheet" href="/css/sentences.css">@endpush

@section('content')
<div class="pr sp" data-sentences data-lesson="{{ $lesson }}" data-mode="{{ $mode }}">
  <h1 class="pr-sr" data-title>Sentences</h1>

  <section class="pr-main" aria-label="Sentence practice session">
    <div class="pr-modes" role="group" aria-label="Mode">
      <a href="{{ route('practice') }}">Write</a>
      <a href="{{ route('practice', ['mode' => 'dictation']) }}">Dictation</a>
      <a href="{{ route('practice.sentences') }}" aria-pressed="true" aria-current="page">Sentence</a>
    </div>

    <p class="pr-msg" data-msg role="status">Building your sentences…</p>

    <div class="pr-session" data-session hidden>
      <div class="pr-top">
        <span class="pr-count" data-count aria-live="polite"></span>
        <div class="pr-bar" role="progressbar" aria-label="Session progress" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0"><i data-bar></i></div>
        <span class="pr-label">{{ $lesson ? optional($lessons->firstWhere('slug', $lesson))->label : 'All lessons' }}</span>
      </div>

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
    </div>

    <section class="pr-summary pr-card" data-summary hidden aria-labelledby="sp-sum-h">
      <h2 id="sp-sum-h" class="pr-h2">Session complete</h2>
      <div class="pr-stats">
        <x-stat-card value="0" label="Correct" tone="green" data-stat="correct" />
        <x-stat-card value="0" label="Missed" tone="red" data-stat="missed" />
        <x-stat-card value="0%" label="Accuracy" tone="gold" data-stat="accuracy" />
      </div>
      <div class="pr-sum-actions">
        <button type="button" class="pr-btn is-primary" data-action="again">Practise these sentences again</button>
        <a class="pr-btn" href="{{ route('practice') }}">Back to Practice</a>
      </div>
    </section>
  </section>

  <aside class="pr-setup" aria-labelledby="sp-setup-h">
    <h2 id="sp-setup-h" class="pr-setup-h">Session</h2>
    <nav class="pr-src sp-sources" aria-label="Choose lesson">
      <span class="pr-which-l">Practise from</span>
      <a class="pr-src-opt" href="{{ route('practice.sentences', ['mode' => $mode]) }}" @if($lesson === '') aria-current="page" @endif><span class="pr-src-t"><b>All lessons</b><span>Mixed sentences</span></span></a>
      <label class="pr-more">
        <span>A lesson</span>
        <select data-more>
          <option value="">Choose…</option>
          @foreach ($lessons as $l)
            <option class="hsk-v{{ ($l->course ?? '2.0') === '3.0' ? 3 : 2 }}" value="{{ route('practice.sentences', ['lesson' => $l->slug, 'mode' => $mode]) }}" @selected($lesson === $l->slug)>{{ $l->label }} · {{ $l->zh_title }}</option>
          @endforeach
        </select>
      </label>
    </nav>
    <div class="pr-which">
      <span class="pr-which-l" id="sp-ex-l">Exercise</span>
      <div class="pr-seg" role="group" aria-labelledby="sp-ex-l">
        <button type="button" data-set-mode="mix" aria-pressed="{{ $mode === 'mix' ? 'true' : 'false' }}">Mixed</button>
        <button type="button" data-set-mode="build" aria-pressed="{{ $mode === 'build' ? 'true' : 'false' }}">Build</button>
        <button type="button" data-set-mode="meaning" aria-pressed="{{ $mode === 'meaning' ? 'true' : 'false' }}">Meaning</button>
      </div>
    </div>
    <p class="pr-info">Sentences come from lesson texts, dialogues and grammar examples. Progress is saved on this device.</p>
  </aside>
</div>
@endsection

@push('scripts')
<script src="/js/store.js"></script>
<script src="/js/ruby.js"></script>
<script src="/js/sentence-practice.js"></script>
<script>document.querySelector('.sp [data-more]').addEventListener('change', function () { if (this.value) location.href = this.value; });</script>
@endpush
