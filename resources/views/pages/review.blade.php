@extends('layouts.app')
@section('title', 'Review')
@push('head')<link rel="stylesheet" href="/css/learn.css"><link rel="stylesheet" href="/css/review.css">@endpush
@section('content')
<div id="rv" data-deck-url="{{ url('/data/review-deck') }}">

  {{-- Deck chooser: shown when no deck is named in the URL --}}
  <section id="rv-choose" hidden>
    <x-page-head eyebrow="Practice" title="Review"><p class="ph-sub" id="rv-summary">Flashcards with spaced repetition.</p></x-page-head>
    <div class="stack">
      <x-action-row id="rv-due-link" icon="clock" title="Cards due" sub="Loading…" :href="route('review', ['source' => 'due'])" />
      <x-action-row id="rv-saved-link" icon="star" title="Saved words" sub="Loading…" :href="route('review', ['source' => 'saved'])" />
    </div>
    <section class="sec">
      <h2>Lessons</h2>
      <div class="stack">
        @foreach ($lessons as $l)
          <x-action-row icon="book" :title="'Lesson '.$l->number.' · '.($l->en_title ?: $l->title)" :sub="count($l->vocab ?? []).' words'" :href="route('review', ['lesson' => $l->slug])" />
        @endforeach
      </div>
    </section>
    <section class="sec">
      <h2>HSK levels</h2>
      @foreach ($levels as $v => $items)
        <p class="eyebrow">HSK {{ $v }}.0</p>
        <div class="chips">
          @foreach ($items as $it)
            <x-chip :href="route('review', ['version' => $v, 'level' => $it['level']])">Level {{ $it['label'] }}</x-chip>
          @endforeach
        </div>
      @endforeach
    </section>
  </section>

  {{-- Study session --}}
  <section id="rv-study" hidden>
    <div class="rv-top">
      <a class="back" href="{{ route('review') }}">‹ Decks</a>
      <span class="rv-title" id="rv-title"></span>
      <span class="rv-count" id="rv-count" aria-live="polite"></span>
    </div>
    <div class="rv-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Session progress"><i id="rv-bar-fill"></i></div>

    <div class="rv-card" id="rv-card" tabindex="-1">
      <div class="rv-face rv-front" id="rv-front"></div>
      <div class="rv-face rv-back" id="rv-back" hidden></div>
    </div>

    <div class="rv-actions">
      <button type="button" class="rv-reveal" id="rv-reveal">Show answer <kbd>Space</kbd></button>
      <div class="rv-rate" id="rv-rate" hidden>
        @foreach ([1 => ['Again', 'again'], 2 => ['Hard', 'hard'], 3 => ['Good', 'good'], 4 => ['Easy', 'easy']] as $n => [$label, $cls])
          <button type="button" class="rv-btn rv-{{ $cls }}" data-rating="{{ $n }}">
            <span class="rv-btn-l">{{ $label }}</span><span class="rv-btn-n" data-next="{{ $n }}"></span><kbd>{{ $n }}</kbd>
          </button>
        @endforeach
      </div>
    </div>
  </section>

  {{-- Done --}}
  <section id="rv-done" hidden>
    <x-page-head eyebrow="Review" title="Session complete" />
    <div class="stat-grid" id="rv-stats"></div>
    <p class="muted" id="rv-done-note"></p>
    <div class="stack">
      <x-action-row id="rv-again-link" variant="dark" icon="repeat" title="Review again" sub="Cards that are due" :href="route('review', ['source' => 'due'])" />
      <x-action-row icon="layers" title="Choose another deck" :href="route('review')" />
      <x-action-row icon="home" title="Back to Today" :href="route('home')" />
    </div>
  </section>

  <p class="rv-empty" id="rv-empty" hidden></p>
  <p class="rv-empty" id="rv-error" role="alert" hidden>Could not load this deck. <a href="">Try again</a></p>
</div>
@endsection
@push('scripts')<script src="/js/store.js"></script><script src="/js/review.js"></script>@endpush
