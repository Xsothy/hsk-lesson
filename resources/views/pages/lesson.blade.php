@extends('layouts.app')
@section('title', 'Lesson '.$lesson->number)
@push('head')<link rel="stylesheet" href="/css/learn.css">@endpush
@section('content')
@php
  $words = collect($lesson->vocab ?? []);
  $chars = $words->flatMap(fn ($w) => preg_split('//u', preg_replace('/[^\p{Han}]/u', '', $w), -1, PREG_SPLIT_NO_EMPTY))->unique()->count();
  $level = ($lesson->course ?? '2.0') === '3.0' ? 'HSK 3.0' : 'HSK '.($lesson->number <= 12 ? 1 : 2);
  $sections = array_filter([
    'vocab' => 'Vocabulary',
    'grammar' => $grammar->count() ? 'Grammar' : null,
    'sentences' => $sentences->count() ? 'Sentences' : null,
    'dialogue' => $dialogue->count() ? 'Dialogue' : null,
    'reading' => $readings->count() ? 'Reading' : null,
    'practice' => 'Practice',
  ]);
@endphp
<section class="lesson-hero">
  <div class="lh-in">
    <div class="lh-text">
      <a class="lh-back" href="{{ route('courses') }}">← All lessons</a>
      <span class="lh-eyebrow">LESSON {{ $lesson->number }} · {{ $level }}</span>
      <h1 class="zh" lang="zh-Hans">{{ $lesson->zh_title ?: $lesson->title }}</h1>
      <p class="lh-desc">{{ $lesson->en_title ?: $lesson->title }}@if ($lesson->description) — {{ $lesson->description }}@endif</p>
    </div>
    <div class="lh-chips">
      <span class="lh-chip">{{ $words->count() }} words</span>
      @if ($grammar->count())<span class="lh-chip">{{ $grammar->count() }} {{ $grammar->count() === 1 ? 'pattern' : 'patterns' }}</span>@endif
      @if ($lesson->is_preview)<span class="lh-chip" data-preview-badge>+ HSK 2 preview</span>@endif
      <span class="lh-chip" data-lesson-done>0% done</span>
    </div>
  </div>
</section>

<div class="lp lesson">
  <nav class="secnav" aria-label="Lesson sections" data-lesson="{{ $lesson->slug }}">
    @foreach ($sections as $id => $label)
      <a href="#{{ $id }}"><span class="sn-dot" aria-hidden="true"></span>{{ $label }}</a>
    @endforeach
  </nav>

  <div class="lesson-main">
    <section id="vocab" class="lsec" data-lesson="{{ $lesson->slug }}">
      <div class="lsec-head"><h2>Vocabulary <span class="zh-sub zh" lang="zh-Hans">词汇</span></h2><span class="lsec-note">Tap a word for strokes</span></div>
      <div class="vocab-grid">
        @foreach ($vocab as $w)
          <x-char-tile :c="$w->hanzi" :p="$w->pinyin" :m="$w->english" dot="new" data-word="{{ $w->hanzi }}" :href="route('char', mb_substr($w->hanzi, 0, 1))" />
        @endforeach
      </div>
      <div class="vocab-foot">
        <span class="legend">Dot: green = known, gold = learning, none = new</span>
        <button type="button" class="link-btn" id="mark-all">Mark all known</button>
      </div>
    </section>

    @if ($grammar->count())
    <section id="grammar" class="lsec">
      <h2>Grammar <span class="zh-sub zh" lang="zh-Hans">语法</span></h2>
      <div class="gram-grid">
        @foreach ($grammar as $g)
          <div class="gram">
            <span class="gram-t">{{ $g['title'] ?? '' }}</span>
            @if (!empty($g['pattern']))<div class="gram-p"><x-ruby-line :tokens="$g['tokens']" :audio="preg_replace('/\[[^\]]*\]/u', '', $g['pattern'])" /></div>@endif
            @if (!empty($g['note']))<p class="gram-n">{{ $g['note'] }}</p>@endif
          </div>
        @endforeach
      </div>
    </section>
    @endif

    @if ($sentences->count())
    <section id="sentences" class="lsec">
      <div class="lsec-head c"><h2>Sentences <span class="zh-sub zh" lang="zh-Hans">句子</span></h2><button type="button" class="pill-btn" data-play-all="sentences-list">Play all</button></div>
      <div class="bubbles" id="sentences-list">
        @foreach ($sentences as $s)
          <x-dialogue-bubble :zh="$s['zh']" :pinyin="$s['pinyin']" :tokens="$s['tokens']" :en="$s['en'] ?? null" />
        @endforeach
      </div>
    </section>
    @endif

    @if ($dialogue->count())
    <section id="dialogue" class="lsec">
      <div class="lsec-head c"><h2>Dialogue <span class="zh-sub zh" lang="zh-Hans">对话</span></h2><button type="button" class="pill-btn" data-play-all="dialogue-list">Play all</button></div>
      <div class="bubbles" id="dialogue-list">
        @foreach ($dialogue as $d)
          <x-dialogue-bubble :speaker="$d['speaker'] ?? null" :zh="$d['zh']" :pinyin="$d['pinyin']" :tokens="$d['tokens']" :en="$d['en'] ?? null" :side="($d['speaker'] ?? 'A') === 'A' ? 'left' : 'right'" />
        @endforeach
      </div>
    </section>
    @endif

    @if ($readings->count())
    <section id="reading" class="lsec">
      <h2>Reading <span class="zh-sub zh" lang="zh-Hans">阅读</span></h2>
      @foreach ($readings as $i => $r)
        <a class="read-row" href="{{ route('reading', [$lesson->slug, $i + 1]) }}">
          <span class="read-g zh" lang="zh-Hans" aria-hidden="true">读</span>
          <span class="read-t"><b class="zh" lang="zh-Hans">{{ $r->title }}</b><span>{{ $r->title_en }}@if($r->type) · {{ $r->type }}@endif · {{ count($r->questions ?? []) }} questions</span></span>
          <span class="read-cta">Read →</span>
        </a>
      @endforeach
    </section>
    @endif

    @if (trim((string) $lesson->content) !== '')
    <section id="notes" class="lsec lesson-notes">
      <h2>Lesson notes</h2>
      <div class="lesson-content">{!! $lesson->content !!}</div>
    </section>
    @endif
  </div>

  <aside id="practice" class="practice-panel">
    <h2>Practice this lesson</h2>
    <p>Everything below uses only this lesson’s {{ $words->count() }} words.</p>
    <x-action-row variant="light" glyph="写" title="Write the characters" :sub="$chars.' characters · stroke feedback'" :href="route('practice', ['lesson' => $lesson->slug])" />
    <x-action-row variant="light" glyph="听" title="Dictation" sub="Hear it, write it from memory" :href="route('practice', ['lesson' => $lesson->slug, 'mode' => 'dictation'])" />
    <x-action-row variant="light" glyph="复" title="Flashcards" sub="0 due today" :href="route('review', ['lesson' => $lesson->slug])" data-lesson-due="{{ json_encode($words->values(), JSON_UNESCAPED_UNICODE) }}" />
    <x-action-row variant="light" glyph="印" title="Print worksheet" sub="Tian-zi grid · PDF" :href="route('worksheet', ['lesson' => $lesson->slug])" />
  </aside>
</div>
@endsection
@push('scripts')<script src="/js/store.js"></script><script src="/js/learn.js"></script>@endpush
