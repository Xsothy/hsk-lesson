@extends('layouts.app')
@section('title', $reading->title)
@push('head')<link rel="stylesheet" href="/css/learn.css">@endpush
@section('content')
<a class="back" href="{{ route('lesson', $lesson->slug) }}#reading">← {{ $lesson->label }}</a>
<x-page-head class="lesson-head" :lead="$reading->emoji" :eyebrow="'Reading '.$n.' of '.$total" :title="$reading->title_en ?: $reading->title"
  :zh="$reading->title_en ? $reading->title : null" />

<div class="toggles" role="group" aria-label="Display">
  <button type="button" class="chip is-active" id="tg-pinyin" aria-pressed="true">Pinyin</button>
  <button type="button" class="chip is-active" id="tg-en" aria-pressed="true">English</button>
</div>

<section class="sec" id="reading-lines">
  <div class="stack">
    @foreach ($lines as $l)
      <x-dialogue-bubble :zh="$l['zh']" :pinyin="$l['pinyin']" :tokens="$l['tokens']" :en="$l['en'] ?? null" />
    @endforeach
  </div>
</section>

@php $questions = $reading->questions ?? []; @endphp
@if (count($questions))
<section class="sec" id="quiz" data-key="{{ $lesson->slug }}/{{ $n }}" data-total="{{ count($questions) }}">
  <h2>Quiz</h2>
  @foreach ($questions as $qi => $q)
    @php
      $isTf = ($q['type'] ?? '') === 'true_false';
      $opts = $isTf ? ['True', 'False'] : ($q['options'] ?? []);
      $answer = $isTf ? ($q['answer'] ? 0 : 1) : (int) $q['answer'];
    @endphp
    <div class="question" data-answer="{{ $answer }}" data-q="{{ $qi }}">
      <p class="q-text"><span class="zh">{{ $q['question'] }}</span>@if(!empty($q['questionEn']))<small>{{ $q['questionEn'] }}</small>@endif</p>
      <div class="stack">
        @foreach ($opts as $oi => $o)
          <x-quiz-option :label="$o" :key="chr(65 + $oi)" data-i="{{ $oi }}" />
        @endforeach
      </div>
      <p class="feedback" role="status" aria-live="polite"></p>
    </div>
  @endforeach
  <div class="score" id="score" role="status" aria-live="polite" hidden></div>
</section>
@endif

@if ($n < $total)
  <x-action-row icon="arrow-right" title="Next reading" :href="route('reading', [$lesson->slug, $n + 1])" />
@endif
@endsection
@push('scripts')<script src="/js/store.js"></script><script src="/js/learn.js"></script><script src="/js/reading.js"></script>@endpush
