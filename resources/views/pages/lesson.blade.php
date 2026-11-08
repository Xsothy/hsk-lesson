@extends('layouts.app')
@section('title', 'Lesson '.$lesson->number)
@push('head')<link rel="stylesheet" href="/css/learn.css">@endpush
@section('content')
<a class="back" href="{{ route('courses') }}">← Courses</a>
<x-page-head class="lesson-head" :lead="$lesson->emoji" :eyebrow="'Lesson '.$lesson->number" :title="$lesson->en_title ?: $lesson->title"
  :zh="$lesson->zh_title" :sub="$lesson->description">
  @if ($lesson->is_preview)<span class="chip" data-preview-badge>+ HSK 2 preview</span>@endif
</x-page-head>

<nav class="section-nav" aria-label="Lesson sections">
  <x-chip href="#vocab">Vocabulary</x-chip>
  @if ($lesson->grammar)<x-chip href="#grammar">Grammar</x-chip>@endif
  @if ($dialogue->count())<x-chip href="#dialogue">Dialogue</x-chip>@endif
  @if ($sentences->count())<x-chip href="#sentences">Sentences</x-chip>@endif
  @if ($readings->count())<x-chip href="#reading">Reading</x-chip>@endif
  <x-chip href="#practice">Practice</x-chip>
</nav>

<section id="vocab" class="sec" data-lesson="{{ $lesson->slug }}">
  <div class="sec-head"><h2>Vocabulary</h2><button type="button" class="btn" id="mark-all">Mark all known</button></div>
  <div class="tile-grid">
    @foreach ($vocab as $w)
      <x-char-tile :c="$w->hanzi" :p="$w->pinyin" :m="$w->english" dot="new" data-word="{{ $w->hanzi }}"
        :href="route('char', mb_substr($w->hanzi, 0, 1))" />
    @endforeach
  </div>
</section>

@if ($lesson->grammar)
<section id="grammar" class="sec">
  <h2>Grammar</h2>
  @foreach ($grammar as $g)
    <article class="gram">
      <h3>{{ $g['title'] ?? '' }}</h3>
      @if (!empty($g['pattern']))<x-ruby-line class="pattern-line" :tokens="$g['tokens']" :audio="preg_replace('/\[[^\]]*\]/u', '', $g['pattern'])" />@endif
      @if (!empty($g['note']))<p>{{ $g['note'] }}</p>@endif
    </article>
  @endforeach
</section>
@endif

@if ($dialogue->count())
<section id="dialogue" class="sec">
  <h2>Dialogue</h2>
  <div class="stack">
    @foreach ($dialogue as $d)
      <x-dialogue-bubble :speaker="$d['speaker'] ?? null" :zh="$d['zh']" :pinyin="$d['pinyin']" :tokens="$d['tokens']" :en="$d['en'] ?? null" :side="($d['speaker'] ?? 'A') === 'A' ? 'left' : 'right'" />
    @endforeach
  </div>
</section>
@endif

@if ($sentences->count())
<section id="sentences" class="sec">
  <h2>Sentences</h2>
  <div class="stack">
    @foreach ($sentences as $s)
      <x-dialogue-bubble :zh="$s['zh']" :pinyin="$s['pinyin']" :tokens="$s['tokens']" :en="$s['en'] ?? null" />
    @endforeach
  </div>
</section>
@endif

@if ($readings->count())
<section id="reading" class="sec">
  <h2>Reading</h2>
  <div class="stack">
    @foreach ($readings as $i => $r)
      <x-action-row icon="book" :title="$r->title" :sub="$r->title_en" :href="route('reading', [$lesson->slug, $i + 1])" />
    @endforeach
  </div>
</section>
@endif

@if (trim((string) $lesson->content) !== '')
<section id="notes" class="sec lesson-notes">
  <h2>Lesson notes</h2>
  <div class="lesson-content">{!! $lesson->content !!}</div>
</section>
@endif

<section id="practice" class="sec practice">
  <h2>Practice this lesson</h2>
  <div class="stack">
    <x-action-row variant="dark" icon="pen" title="Write the characters" sub="Stroke-order practice" :href="route('practice', ['lesson' => $lesson->slug])" />
    <x-action-row variant="dark" icon="repeat" title="Review as flashcards" sub="{{ count($lesson->vocab ?? []) }} words" :href="route('review', ['lesson' => $lesson->slug])" />
  </div>
</section>
@endsection
@push('scripts')<script src="/js/store.js"></script><script src="/js/learn.js"></script>@endpush
