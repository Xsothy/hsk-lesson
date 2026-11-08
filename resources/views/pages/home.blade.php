@extends('layouts.app')
@section('title', 'Today')
@push('head')<link rel="stylesheet" href="/css/learn.css">@endpush
@section('content')
<h1>Today</h1>

<a class="continue" id="continue" href="{{ route('lesson', $lessons->first()->slug ?? 'lesson-1') }}" data-default="{{ route('lesson', $lessons->first()->slug ?? 'lesson-1') }}">
  <span class="eyebrow">Continue</span>
  <span class="continue-title" id="continue-title">Lesson 1 · {{ $lessons->first()->title ?? 'Start learning' }}</span>
  <span class="continue-sub" id="continue-sub">Start here</span>
</a>

<section class="sec">
  <h2>Today</h2>
  <div class="stat-grid">
    <a class="plain" href="{{ route('review') }}"><x-stat-card value="0" label="Cards due" tone="red" data-today="due" /></a>
    <x-stat-card value="0/10" label="Characters written" tone="green" data-today="chars" />
    <x-stat-card value="0" label="Day streak" tone="gold" data-today="streak" />
    @if ($cotd)
      <div class="cotd">
        <span class="eyebrow">Character of the day</span>
        <x-char-tile :c="$cotd->simplified" :p="$cotd->pinyin" :m="is_array($cotd->meanings) ? ($cotd->meanings[0] ?? null) : null" :large="true" :href="route('char', $cotd->simplified)" />
      </div>
    @endif
  </div>
</section>

<section class="sec">
  <h2>Four hubs</h2>
  <div class="hub-grid">
    <x-action-row icon="📖" title="Learn" sub="Lessons & readings" :href="route('courses')" />
    <x-action-row icon="✍️" title="Practice" sub="Write characters" :href="route('practice')" />
    <x-action-row icon="🔁" title="Review" sub="Flashcards" :href="route('review')" />
    <x-action-row icon="🔤" title="Browse" sub="HSK lists & dictionary" :href="route('browse')" />
  </div>
</section>

<section class="sec">
  <h2>Explore</h2>
  <div class="chips">
    <x-chip :href="route('search')">Search</x-chip>
    <x-chip :href="route('words')">My words</x-chip>
    <x-chip :href="route('tools')">Tools</x-chip>
    <x-chip :href="route('settings')">Settings</x-chip>
  </div>
</section>

<section class="sec">
  <div class="sec-head"><h2>Your course</h2><a href="{{ route('courses') }}">All</a></div>
  <div class="card-grid">
    @foreach ($lessons as $l)
      <x-lesson-card :n="$l->n" :title="$l->title" :sub="$l->zh" :href="route('lesson', $l->slug)" data-words="{{ json_encode($l->vocab, JSON_UNESCAPED_UNICODE) }}" />
    @endforeach
  </div>
</section>

<section class="sec">
  <div class="sec-head"><h2>HSK path</h2></div>
  <div class="path-grid">
    @foreach ([2 => $hsk2, 3 => $hsk3] as $v => $counts)
      @foreach (\App\Http\Controllers\LearnController::levels($v) as $lv)
        <a class="path-card" href="{{ route('courses', ['tab' => 'hsk'.$v]) }}">
          <span class="path-v">HSK {{ $v }}.0</span>
          <span class="path-l">Level {{ \App\Http\Controllers\LearnController::levelLabel($v, $lv) }}</span>
          <span class="muted">{{ number_format($counts[$lv] ?? 0) }} words</span>
        </a>
      @endforeach
    @endforeach
  </div>
</section>
@endsection
@push('scripts')<script src="/js/store.js"></script><script src="/js/learn.js"></script>@endpush
