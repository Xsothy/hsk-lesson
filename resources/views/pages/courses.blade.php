@extends('layouts.app')
@section('title', 'Courses')
@push('head')<link rel="stylesheet" href="/css/learn.css"><link rel="stylesheet" href="/css/courses.css"><meta name="csrf-token" content="{{ csrf_token() }}">@endpush
@section('content')
<x-page-head eyebrow="Learn" title="Courses" />
<div class="course-bar">
  <nav class="chips chip-scroll" aria-label="Course">
    <x-chip :href="route('courses', ['tab' => 'ours'])" :active="$tab === 'ours'">Our course</x-chip>
    <x-chip :href="route('courses', ['tab' => 'hsk'])" :active="$tab === 'hsk'">HSK levels</x-chip>
    <x-chip :href="route('courses', ['tab' => 'textbooks'])" :active="$tab === 'textbooks'">Textbooks</x-chip>
  </nav>
  @if ($tab !== 'textbooks')
    <p class="ver-note"><span class="ver-pill ver-2 hsk-v2">HSK 2.0</span><span class="ver-pill ver-3 hsk-v3">HSK 3.0</span>
      <a href="{{ route('settings') }}#st-study">Change in Settings</a></p>
  @endif
</div>

@if ($tab === 'ours')
  <div class="hsk-v2" data-course="2.0">
    @foreach ($courses[2]->groupBy(fn ($l) => $l->n <= 12 ? 1 : 2) as $level => $group)
      <h2 class="course-group">HSK {{ $level }} <span class="muted">· Lessons {{ $group->first()->n }}–{{ $group->last()->n }}</span></h2>
      <div class="card-grid">
        @foreach ($group as $l)
          <x-lesson-card :n="$l->n" :title="$l->title" :sub="$l->zh" :href="route('lesson', $l->slug)" data-words="{{ json_encode($l->vocab, JSON_UNESCAPED_UNICODE) }}" />
        @endforeach
      </div>
    @endforeach
  </div>
  <div class="hsk-v3" data-course="3.0">
    @if ($courses[3]->isNotEmpty())
      <div class="card-grid">
        @foreach ($courses[3] as $l)
          <x-lesson-card :n="$l->n" :title="$l->title" :sub="$l->zh" :href="route('lesson', $l->slug)" data-words="{{ json_encode($l->vocab, JSON_UNESCAPED_UNICODE) }}" />
        @endforeach
      </div>
    @else
      <p class="muted">Our HSK 3.0 course is coming next — new lessons built on the HSK 3.0 syllabus. Until then, study the official HSK 3.0 word lists under <a href="{{ route('courses', ['tab' => 'hsk']) }}">HSK levels</a>, or switch to HSK 2.0 in Settings for our current 24 lessons.</p>
      <ul class="planned">
        @foreach (\App\Http\Controllers\LearnController::levels(3) as $lv)
          <li><span>Level {{ \App\Http\Controllers\LearnController::levelLabel(3, $lv) }}</span><span class="tag-planned">Planned</span></li>
        @endforeach
      </ul>
    @endif
  </div>
@elseif ($tab === 'textbooks')
  <section class="tb" data-textbooks>
    <p class="muted">Bring your own textbook words. Paste or upload a list — one word per line, or <code>hanzi,pinyin,meaning</code>. Missing pinyin and meanings are filled in from the HSK and dictionary data. Lists stay in your browser (and sync with your account).</p>
    <div class="tb-import">
      <label class="tb-label" for="tb-name">List name</label>
      <input id="tb-name" class="tb-input" type="text" maxlength="60" placeholder="e.g. Book 1 · Lesson 3" autocomplete="off">
      <label class="tb-label" for="tb-text">Words</label>
      <textarea id="tb-text" class="tb-input tb-text" rows="6" placeholder="学习&#10;你好,nǐ hǎo,hello&#10;朋友"></textarea>
      <div class="tb-actions">
        <label class="btn tb-file"><x-icon name="book" :size="20" /> Upload CSV<input id="tb-file" type="file" accept=".csv,.txt,text/csv,text/plain" hidden></label>
        <button type="button" class="btn btn-primary" id="tb-import"><x-icon name="arrow-right" :size="20" /> Import list</button>
      </div>
      <p class="tb-status muted" id="tb-status" role="status" aria-live="polite"></p>
    </div>
    <div id="tb-lists" class="tb-lists" aria-live="polite"></div>
    <p class="muted" id="tb-empty" hidden>No lists yet. Import one above.</p>
    <template id="tb-row"><x-word-row :word="['hanzi' => '', 'pinyin' => '', 'english' => '']" :audio="false" /></template>
  </section>
@else
  @foreach ([2, 3] as $version)
  <div class="hsk-v{{ $version }}">
  <p class="muted">{{ $version === 2 ? 'HSK 2.0 — 6 levels' : 'HSK 3.0 — levels 1–6 and 7–9' }}. Each level is split into study sets of 15 words, most frequent first.</p>
  <div class="levels">
    @foreach (\App\Http\Controllers\LearnController::levels($version) as $lv)
      @php $total = $counts[$version][$lv] ?? 0; $label = \App\Http\Controllers\LearnController::levelLabel($version, $lv); @endphp
      <details class="level" data-version="{{ $version }}" data-level="{{ $lv }}">
        <summary>
          <span class="level-n">Level {{ $label }}</span>
          <span class="level-meta">{{ number_format($total) }} words · {{ (int) ceil($total / 15) }} sets</span>
        </summary>
        <div class="sets" aria-live="polite"><span class="muted">Loading…</span></div>
      </details>
    @endforeach
  </div>
  </div>
  @endforeach
@endif
@endsection
@push('scripts')<script src="/js/store.js"></script><script src="/js/learn.js"></script>@if ($tab === 'textbooks')<script src="/js/textbooks.js"></script>@endif @endpush
