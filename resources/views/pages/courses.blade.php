@extends('layouts.app')
@section('title', 'Courses')
@push('head')<link rel="stylesheet" href="/css/learn.css">@endpush
@section('content')
<h1>Courses</h1>
<nav class="chips" aria-label="Course">
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
  <div class="placeholder">Textbooks are coming in beta.</div>
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
@push('scripts')<script src="/js/store.js"></script><script src="/js/learn.js"></script>@endpush
