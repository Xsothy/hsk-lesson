@extends('layouts.app')
@section('title', 'Quiz · '.($lesson->en_title ?: $lesson->title))
@push('head')<link rel="stylesheet" href="/css/quiz.css">@endpush
@section('content')
<div class="qz" id="qz" data-lesson-url="{{ route('lesson', $lesson->slug) }}" data-sounds-url="{{ url('/data/sounds') }}">
  <script type="application/json" id="qz-data">{!! json_encode($data, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) !!}</script>

  {{-- Start --}}
  <section class="qz-screen" id="qz-start">
    <x-page-head eyebrow="Lesson quiz · beta" :title="$lesson->en_title ?: $lesson->title" :zh="$lesson->title" sub="One question at a time, checked as you go: read, listen, speak and write this lesson's words." />
    @if ($enough)
      <div class="qz-opts">
        <label class="qz-opt" for="qz-o-hearts">Hearts (5 mistakes end the session) <input type="checkbox" id="qz-o-hearts" checked></label>
        <label class="qz-opt" for="qz-o-fx">Sound effects <input type="checkbox" id="qz-o-fx" checked></label>
      </div>
      <p class="qz-note" id="qz-note"></p>
      <div class="qz-row">
        <button class="qz-btn" id="qz-go" type="button">Start quiz</button>
        <a class="qz-btn is-ghost" href="{{ route('lesson', $lesson->slug) }}">Back to the lesson</a>
      </div>
      <noscript><p class="qz-note">The quiz needs JavaScript.</p></noscript>
    @else
      <p class="qz-note">This lesson does not have enough words for a quiz yet.</p>
      <div class="qz-row"><a class="qz-btn is-ghost" href="{{ route('lesson', $lesson->slug) }}">Back to the lesson</a></div>
    @endif
  </section>

  {{-- Quiz --}}
  <section class="qz-play" id="qz-play" hidden>
    <div class="qz-top">
      <button class="qz-icon" id="qz-quit" type="button" aria-label="Quit quiz"><x-icon name="close" :size="22" /></button>
      <div class="qz-bar" id="qz-bar" role="progressbar" aria-label="Quiz progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="qz-bar-fill"></i></div>
      <div class="qz-hearts" id="qz-hearts" aria-live="polite"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 2.8 4.5 6.5 4.5c2 0 3.6 1 5.500 3 1.900-2 3.500-3 5.500-3 3.700 0 5.600 3.700 4.100 7.200C19.500 16.400 12 21 12 21z"/></svg><span id="qz-hearts-n">5</span><span class="qz-sr">hearts left</span></div>
    </div>
    <div class="qz-stage" id="qz-stage"></div>
    <div class="qz-foot" id="qz-foot">
      <div class="qz-fb" role="status" aria-live="polite"><span class="qz-fb-ico" id="qz-fb-ico"></span><div><b id="qz-fb-title"></b><span id="qz-fb-text"></span></div></div>
      <button class="qz-btn" id="qz-check" type="button" disabled>Check</button>
    </div>
  </section>

  {{-- Done --}}
  <section class="qz-screen" id="qz-done" hidden>
    <header class="page-head">
      <span class="eyebrow" id="qz-done-eyebrow">Quiz complete</span>
      <h2 class="qz-h" id="qz-done-title" tabindex="-1">Well done</h2>
      <p class="ph-sub" id="qz-done-sub"></p>
    </header>
    <div class="qz-stats">
      <div class="qz-stat is-xp"><b id="qz-st-xp">0</b><span>XP</span></div>
      <div class="qz-stat is-acc"><b id="qz-st-acc">0%</b><span>Accuracy</span></div>
      <div class="qz-stat is-time"><b id="qz-st-time">0:00</b><span>Time</span></div>
    </div>
    <div class="qz-missed" id="qz-missed" hidden></div>
    <div class="qz-row">
      <button class="qz-btn" id="qz-again" type="button">Practice again</button>
      <a class="qz-btn is-ghost" href="{{ route('lesson', $lesson->slug) }}">Back to the lesson</a>
    </div>
  </section>
</div>
@endsection
@push('scripts')
<script src="/vendor/hanzi-writer-3.7.2.min.js"></script>
<script src="/js/store.js"></script>
<script src="/js/character.js"></script>
<script src="/js/quiz.js"></script>
@endpush
