@extends('layouts.app')
@section('title', 'Courses')
@push('head')<link rel="stylesheet" href="/css/learn.css"><meta name="csrf-token" content="{{ csrf_token() }}">@endpush
@section('content')
<x-page-head eyebrow="Learn" title="Courses" />
<nav class="chips chip-scroll" aria-label="Course">
  <x-chip :href="route('courses', ['tab' => 'ours'])" :active="$tab === 'ours'">Our course</x-chip>
  <x-chip :href="route('courses', ['tab' => 'hsk2'])" :active="$tab === 'hsk2'">HSK 2.0</x-chip>
  <x-chip :href="route('courses', ['tab' => 'hsk3'])" :active="$tab === 'hsk3'">HSK 3.0</x-chip>
  <x-chip :href="route('courses', ['tab' => 'textbooks'])" :active="$tab === 'textbooks'">Textbooks</x-chip>
</nav>

@if ($tab === 'ours')
  <div class="card-grid">
    @foreach ($lessons as $l)
      <x-lesson-card :n="$l->n" :title="$l->title" :sub="$l->zh" :href="route('lesson', $l->slug)" data-words="{{ json_encode($l->vocab, JSON_UNESCAPED_UNICODE) }}" />
    @endforeach
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
  <p class="muted">{{ $version === 2 ? 'HSK 2.0 — 6 levels' : 'HSK 3.0 — levels 1–6 and 7–9' }}. Each level is split into study sets of 15 words, most frequent first.</p>
  <div class="levels">
    @foreach (\App\Http\Controllers\LearnController::levels($version) as $lv)
      @php $total = $counts[$lv] ?? 0; $label = \App\Http\Controllers\LearnController::levelLabel($version, $lv); @endphp
      <details class="level" data-version="{{ $version }}" data-level="{{ $lv }}">
        <summary>
          <span class="level-n">Level {{ $label }}</span>
          <span class="level-meta">{{ number_format($total) }} words · {{ (int) ceil($total / 15) }} sets</span>
        </summary>
        <div class="sets" aria-live="polite"><span class="muted">Loading…</span></div>
      </details>
    @endforeach
  </div>
@endif
@endsection
@push('scripts')<script src="/js/store.js"></script><script src="/js/learn.js"></script>@if ($tab === 'textbooks')<script src="/js/textbooks.js"></script>@endif @endpush
