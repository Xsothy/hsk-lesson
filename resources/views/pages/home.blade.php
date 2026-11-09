@extends('layouts.app')
@section('title', 'Today')
@push('head')<link rel="stylesheet" href="/css/learn.css">@endpush
@section('content')
@php
  // Lesson glyph tiles cycle through the canvas tints (tokens only, so theme presets still apply).
  $tints = ['orange-t', 'red-t', 'blue-t', 'gold-t', 'green-s', 'soft', 'gold-s', 'green-t'];
  $first = $lessons->first();
  $titles = $lessons->mapWithKeys(fn ($l) => [$l->slug => ['n' => $l->n, 'zh' => $l->zh, 'en' => $l->title, 'of' => $lessons->where('course', $l->course)->count(), 'words' => $l->vocab]]);
@endphp
<div class="lp home">
  {{-- 1. Continue + Today --}}
  <section class="home-top">
    <a class="continue" id="continue" href="{{ route('lesson', $first->slug ?? 'lesson-1') }}" data-default="{{ route('lesson', $first->slug ?? 'lesson-1') }}"
      data-lessons="{{ json_encode($titles, JSON_UNESCAPED_UNICODE) }}">
      <span class="ct-eyebrow" id="continue-eyebrow">{{ $first ? 'CONTINUE · LESSON '.$first->n.' OF '.$lessons->where('course', $first->course)->count() : 'START LEARNING' }}</span>
      <span class="ct-main">
        <span class="ct-glyph zh" lang="zh-Hans" id="continue-glyph" aria-hidden="true">{{ $first ? mb_substr(preg_replace('/[^\p{Han}]/u', '', (string) $first->zh), 0, 1) : '学' }}</span>
        <span class="ct-text">
          <span class="ct-title zh" lang="zh-Hans" id="continue-title">{{ $first->zh ?? 'Start learning' }}</span>
          <span class="ct-sub" id="continue-sub">{{ $first ? $first->title.' · next: Vocabulary' : '' }}</span>
        </span>
      </span>
      <span class="ct-prog">
        <span class="ct-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Lesson progress"><i id="continue-bar" style="width:0%"></i></span>
        <span class="ct-steps">Vocabulary · Grammar · Sentences · Dialogue · Reading</span>
      </span>
      <span class="ct-btn" id="continue-btn">{{ $first ? 'Continue lesson' : 'Browse courses' }}</span>
    </a>
    <div class="today">
      <h2>Today <span class="zh-sub zh" lang="zh-Hans">今天</span></h2>
      <x-action-row variant="red" glyph="0 " title="Cards due for review" sub="≈ 0 minutes" cta="Review →" :href="route('review')" data-today="due" />
      <x-action-row variant="light" glyph="0 " title="Characters written · 0/10" sub="today" cta="Write →" :href="route('practice')" data-today="chars" />
      @if ($cotd)
        <x-action-row variant="gold" :glyph="$cotd->simplified" title="Character of the day"
          :sub="$cotd->pinyin.(is_array($cotd->meanings) && !empty($cotd->meanings[0]) ? ' · '.$cotd->meanings[0] : '')" cta="Open →" :href="route('char', $cotd->simplified)" data-today="cotd" />
      @endif
    </div>
  </section>

  {{-- 2. Hubs --}}
  <section class="hubs">
    <a class="hub" href="{{ route('courses') }}"><span class="hub-g zh hub-learn" lang="zh-Hans" aria-hidden="true">学</span><b>Learn</b><span class="hub-sub">{{ $lessons->count() }} lessons with grammar, dialogues and readings</span></a>
    <a class="hub" href="{{ route('practice') }}"><span class="hub-g zh hub-practice" lang="zh-Hans" aria-hidden="true">写</span><b>Practice</b><span class="hub-sub">Write with stroke feedback, dictation, sentences</span></a>
    <a class="hub" href="{{ route('review') }}"><span class="hub-g zh hub-review" lang="zh-Hans" aria-hidden="true">复</span><b>Review</b><span class="hub-sub">Spaced-repetition flashcards for every lesson</span></a>
    <a class="hub" href="{{ route('worksheet') }}"><span class="hub-g zh hub-print" lang="zh-Hans" aria-hidden="true">印</span><b>Print</b><span class="hub-sub">Worksheets from any lesson or word list</span></a>
  </section>

  {{-- 3. Lessons --}}
  <section class="sec-col">
    <div class="sec-row">
      <h2 class="h2-l">Your course <span class="zh-sub zh" lang="zh-Hans">课程</span></h2>
      @foreach ([2 => '2.0', 3 => '3.0'] as $v => $c)
        <span class="sec-meta hsk-v{{ $v }}" data-course-done="{{ $c }}">HSK {{ $c }} · 0 of {{ $lessons->where('course', $c)->count() }} done</span>
      @endforeach
    </div>
    @if ($lessons->where('course', '3.0')->isEmpty())<p class="muted hsk-v3 empty-note">Our HSK 3.0 course is coming next. Switch to HSK 2.0 in <a href="{{ route('settings') }}#st-study">Settings</a> for our current lessons.</p>@endif
    <div class="card-grid">
      @foreach ($lessons as $i => $l)
        <x-lesson-card class="hsk-v{{ ($l->course ?? '2.0') === '3.0' ? 3 : 2 }}" :n="$l->n" :title="$l->title" :zh="$l->zh" :tint="$tints[$i % count($tints)]" :href="route('lesson', $l->slug)"
          data-course="{{ $l->course }}" data-words="{{ json_encode($l->vocab, JSON_UNESCAPED_UNICODE) }}" />
      @endforeach
    </div>
  </section>

  {{-- 4. Explore --}}
  <section class="sec-col explore">
    <h2 class="h2-l">Explore <span class="zh-sub zh" lang="zh-Hans">更多</span></h2>
    <div class="explore-grid">
      <x-action-row variant="light" glyph="读" title="Readings" :sub="$readingCount.' stories with questions'" :href="$first ? route('lesson', $first->slug).'#reading' : route('courses')" />
      <x-action-row variant="light" glyph="部" title="Character parts" sub="meaning & sound clues" :href="route('browse')" />
      <x-action-row variant="light" glyph="对" title="Pinyin match" sub="quick matching game" :href="route('practice.match')" />
      <x-action-row variant="light" glyph="指" title="Guides" sub="strokes, tones, look-alikes" :href="route('guides')" />
      <x-action-row variant="light" glyph="工" title="Tools" sub="pinyin converter, HSK checker" :href="route('tools')" />
      <x-action-row variant="light" glyph="我" title="My words" sub="saved words & progress" :href="route('words')" />
    </div>
  </section>

  {{-- 5. HSK path --}}
  <section class="path">
    <div class="sec-row wrap">
      <h2>HSK path</h2>
      <a class="path-all" href="{{ route('browse') }}">All word lists →</a>
    </div>
    @foreach ([2 => $hsk2, 3 => $hsk3] as $v => $counts)
      <div class="path-grid hsk-v{{ $v }}">
        @foreach (\App\Http\Controllers\LearnController::levels($v) as $lv)
          <a class="path-card" href="{{ route('browse', ['version' => $v, 'level' => $lv]) }}" data-version="{{ $v }}" data-level="{{ $lv }}">
            <span class="path-top"><b>HSK {{ \App\Http\Controllers\LearnController::levelLabel($v, $lv) }}</b><span class="path-words">{{ number_format($counts[$lv] ?? 0) }} words</span></span>
            <span class="path-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Known words"><i style="width:0%"></i></span>
            <span class="path-known"><span data-known>0</span> known</span>
          </a>
        @endforeach
      </div>
    @endforeach
  </section>
</div>
@endsection
@push('scripts')<script src="/js/store.js"></script><script src="/js/learn.js"></script>@endpush
