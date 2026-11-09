@extends('layouts.app')
@section('title', $q !== '' ? "Search: $q" : 'Browse')
@push('head')<link rel="stylesheet" href="/css/browse.css">@endpush
@section('content')
<x-page-head eyebrow="Characters" title="Browse" />
<form class="browse-search" role="search" action="{{ route('browse') }}" method="get">
  <label class="sr-only" for="browse-q">Search HSK words</label>
  <input id="browse-q" type="search" name="q" value="{{ $q }}" placeholder="Hanzi, pinyin or English" autocomplete="off" autocapitalize="off" spellcheck="false">
  <button type="submit" class="btn">Search</button>
</form>

@if (! request()->hasAny(['tab', 'version', 'q']))
<script>/* No tab chosen: open the HSK list for the version picked in Settings. */
if (document.documentElement.getAttribute('data-hsk') === '3') location.replace('{{ route('browse', ['tab' => 'hsk3']) }}');</script>
@endif
<nav class="chips chip-scroll browse-tabs" aria-label="Browse by">
  @foreach (\App\Http\Controllers\BrowseController::TABS as $key => $label)
    <x-chip :class="match ($key) { 'hsk2' => 'hsk-v2', 'hsk3' => 'hsk-v3', default => null }" :href="route('browse', ['tab' => $key])" :active="$tab === $key">{{ $label }}</x-chip>
  @endforeach
</nav>

@if ($tab === 'hsk2' || $tab === 'hsk3')
  <nav class="chips chip-scroll sub-chips" aria-label="Level">
    @foreach ($levels as $lv)
      <x-chip :href="route('browse', ['tab' => $tab, 'level' => $lv])" :active="$lv === $level && !$set">Level {{ \App\Http\Controllers\LearnController::levelLabel($version, $lv) }}</x-chip>
    @endforeach
  </nav>
  @if ($set)
    <p class="set-note">Study set {{ $set }} of {{ $sets }} from <a href="{{ route('courses', ['tab' => $tab]) }}">Courses</a> ·
      <a href="{{ route('browse', ['tab' => $tab, 'level' => $level]) }}">Show whole level</a></p>
  @endif
@elseif ($tab === 'pinyin')
  <details class="picker" @if(!$syl) open @endif>
    <summary>{{ $syl ? 'Syllable: '.$syl : 'Pick a syllable' }}</summary>
    @foreach ($groups as $letter => $syllables)
      <div class="picker-group">
        <h2 class="picker-h">{{ strtoupper($letter) }}</h2>
        <div class="picker-items">
          @foreach ($syllables as $s => $n)
            <a class="pick @if($s === $syl) is-active @endif" href="{{ route('browse', ['tab' => 'pinyin', 'syl' => $s]) }}" @if($s === $syl) aria-current="true" @endif>{{ $s }}<small>{{ $n }}</small></a>
          @endforeach
        </div>
      </div>
    @endforeach
  </details>
  @if ($syl)
    <nav class="chips chip-scroll sub-chips" aria-label="Tone">
      <x-chip :href="route('browse', ['tab' => 'pinyin', 'syl' => $syl])" :active="!$tone">All tones</x-chip>
      @foreach ($toneCounts as $t => $n)
        <x-chip :href="route('browse', ['tab' => 'pinyin', 'syl' => $syl, 'tone' => $t])" :active="$tone === $t" class="tone-{{ $t }}">{{ $t === 5 ? 'Neutral' : 'Tone '.$t }} · {{ $n }}</x-chip>
      @endforeach
    </nav>
  @endif
@elseif ($tab === 'radical')
  <details class="picker" @if(!$radical) open @endif>
    <summary>{{ $radical ? 'Radical: '.$radical : 'Pick a radical' }}</summary>
    @foreach ($groups as $strokes => $radicals)
      <div class="picker-group">
        <h2 class="picker-h">{{ $strokes === 99 ? 'Other' : $strokes.' '.str('stroke')->plural($strokes) }}</h2>
        <div class="picker-items">
          @foreach ($radicals as $r => $n)
            <a class="pick pick-zh @if($r === $radical) is-active @endif" href="{{ route('browse', ['tab' => 'radical', 'r' => $r]) }}" @if($r === $radical) aria-current="true" @endif aria-label="{{ $r }}, {{ $n }} characters"><span class="zh">{{ $r }}</span><small>{{ $n }}</small></a>
          @endforeach
        </div>
      </div>
    @endforeach
  </details>
@endif

@if ($title)
  <section class="browse-results" aria-labelledby="results-title" data-practice="{{ http_build_query($practice) }}">
    <div class="browse-bar">
      <h2 id="results-title" class="results-title">{{ $title }}</h2>
      <div class="browse-controls">
        <div class="seg" role="group" aria-label="Show">
          <button type="button" class="seg-btn" data-filter="all" aria-pressed="true">All</button>
          <button type="button" class="seg-btn" data-filter="learn" aria-pressed="false">To learn</button>
          <button type="button" class="seg-btn" data-filter="known" aria-pressed="false">Known</button>
        </div>
        <div class="seg" role="group" aria-label="View">
          <button type="button" class="seg-btn" data-view="list" aria-pressed="true">List</button>
          <button type="button" class="seg-btn" data-view="grid" aria-pressed="false">Grid</button>
        </div>
        <a class="btn btn-primary practise" href="{{ route('practice', $practice) }}">Practise</a>
      </div>
    </div>

    @if ($items->isEmpty())
      <p class="empty">No matches. Try toneless pinyin (“xue”), a character (“学”) or an English word (“study”).</p>
    @else
      <div class="browse-list" data-pane="list">
        @foreach ($items as $it)
          <x-word-row :word="$it" :audio="false" :href="route('char', mb_substr($it->hanzi, 0, 1))" data-word="{{ $it->hanzi }}" />
        @endforeach
      </div>
      <div class="browse-grid" data-pane="grid" hidden>
        @foreach ($items as $it)
          <x-char-tile :c="$it->hanzi" :p="$it->pinyin" :m="$it->short" :tone="$it->tone" dot="new" :href="route('char', mb_substr($it->hanzi, 0, 1))" data-word="{{ $it->hanzi }}" data-len="{{ min(mb_strlen($it->hanzi), 4) }}" />
        @endforeach
      </div>
      <p class="empty" data-empty hidden>Nothing here with this filter.</p>
    @endif

    @if ($paginator && $paginator->lastPage() > 1)
      <nav class="pager" aria-label="Pages">
        @if ($paginator->onFirstPage())<span class="btn is-disabled" aria-disabled="true">‹ Prev</span>@else<a class="btn" href="{{ $paginator->previousPageUrl() }}" rel="prev">‹ Prev</a>@endif
        <span class="pager-n">Page {{ $paginator->currentPage() }} of {{ $paginator->lastPage() }}</span>
        @if ($paginator->hasMorePages())<a class="btn" href="{{ $paginator->nextPageUrl() }}" rel="next">Next ›</a>@else<span class="btn is-disabled" aria-disabled="true">Next ›</span>@endif
      </nav>
    @endif
  </section>
@elseif ($tab === 'pinyin' || $tab === 'radical')
  <p class="muted browse-hint">{{ $tab === 'pinyin' ? 'Characters from the HSK lists, grouped by toneless syllable. Pick one, then filter by tone.' : 'Characters from the HSK lists, grouped by radical. Radicals are ordered by stroke count.' }}</p>
@endif
@endsection
@push('scripts')<script src="/js/store.js"></script><script src="/js/browse.js"></script>@endpush
