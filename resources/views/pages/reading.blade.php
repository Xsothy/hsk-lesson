@extends('layouts.app')
@section('title', $reading->title)
@push('head')<link rel="stylesheet" href="/css/learn.css">@endpush
@section('content')
@php
  $questions = $reading->questions ?? [];
  $words = collect($lines)->flatMap(fn ($l) => $l['words'] ?? [])->filter(fn ($w) => preg_match('/\p{Han}/u', $w))->unique()->values();
@endphp
<div class="lp reading">
  <div class="rd-head">
    <a class="rd-back" href="{{ route('lesson', $lesson->slug) }}#reading">← {{ $lesson->label }} · <span lang="zh-Hans">{{ $lesson->zh_title ?: $lesson->title }}</span></a>
    <div class="rd-tags">
      @if ($reading->type)<span class="rd-tag rd-type">{{ $reading->type }}</span>@endif
      @if ($reading->difficulty)<span class="rd-tag rd-diff">Difficulty {{ $reading->difficulty }}</span>@endif
      <span class="rd-tag rd-known" id="rd-known" data-words="{{ json_encode($words, JSON_UNESCAPED_UNICODE) }}">Reading {{ $n }} of {{ $total }}</span>
    </div>
    <h1 class="zh" lang="zh-Hans">{{ $reading->title }}</h1>
    @if ($reading->title_en)<p>{{ $reading->title_en }}</p>@endif
  </div>

  <div class="rd-body">
    <section class="rd-text">
      <div class="rd-toggles" role="group" aria-label="Display">
        <button type="button" class="tg-btn" id="tg-pinyin" aria-pressed="true">Pinyin</button>
        <button type="button" class="tg-btn" id="tg-en" aria-pressed="true">English</button>
        <button type="button" class="pill-btn" data-play-all="reading-lines">Play all</button>
      </div>
      <div class="rd-lines" id="reading-lines">
        @foreach ($lines as $i => $l)
          <div class="rd-line">
            <span class="rd-n">{{ $i + 1 }}</span>
            <div class="rd-l">
              @if ($l['tokens'])<x-ruby-line :tokens="$l['tokens']" />
              @else<span class="zh rl-text" lang="zh-Hans">{{ $l['zh'] }}</span>@if($l['pinyin'])<span class="rd-py">{{ $l['pinyin'] }}</span>@endif
              @endif
              @if (!empty($l['en']))<span class="rd-en">{{ $l['en'] }}</span>@endif
            </div>
            <button type="button" class="rd-play" data-say="{{ $l['zh'] }}" aria-label="Play line {{ $i + 1 }}"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></button>
          </div>
        @endforeach
      </div>
      <p class="rd-hint">Tap any word in the text to open its character page.</p>
      @if ($n < $total)
        <x-action-row class="rd-nextread" variant="light" glyph="读" title="Next reading" :sub="'Reading '.($n + 1).' of '.$total" :href="route('reading', [$lesson->slug, $n + 1])" />
      @endif
    </section>

    @if (count($questions))
    <aside class="quiz" id="quiz" data-key="{{ $lesson->slug }}/{{ $n }}" data-total="{{ count($questions) }}">
      <div class="quiz-head"><h2>Questions</h2><span class="quiz-count" id="quiz-count">1 of {{ count($questions) }}</span></div>
      <span class="quiz-bar" role="progressbar" aria-label="Question progress" aria-valuemin="0" aria-valuemax="{{ count($questions) }}" aria-valuenow="1"><i style="width:{{ round(100 / count($questions)) }}%"></i></span>
      @foreach ($questions as $qi => $q)
        @php
          $isTf = ($q['type'] ?? '') === 'true_false';
          $opts = $isTf ? ['True', 'False'] : ($q['options'] ?? []);
          $answer = $isTf ? ($q['answer'] ? 0 : 1) : (int) $q['answer'];
        @endphp
        <fieldset class="question" data-answer="{{ $answer }}" data-q="{{ $qi }}" @if($qi) hidden @endif>
          <legend><span class="q-zh zh" lang="zh-Hans">{{ $q['question'] }}</span>@if(!empty($q['questionEn']))<span class="q-en">{{ $q['questionEn'] }}</span>@endif</legend>
          @foreach ($opts as $oi => $o)
            <x-quiz-option :label="$o" :key="chr(65 + $oi)" data-i="{{ $oi }}" />
          @endforeach
          <p class="feedback" role="status" aria-live="polite"></p>
        </fieldset>
      @endforeach
      <div class="score" id="score" role="status" aria-live="polite" hidden></div>
      <button type="button" class="quiz-next" id="quiz-next" disabled>{{ count($questions) > 1 ? 'Next question' : 'Finish' }}</button>
    </aside>
    @endif
  </div>
</div>
@endsection
@push('scripts')<script src="/js/store.js"></script><script src="/js/learn.js"></script><script src="/js/reading.js"></script>@endpush
