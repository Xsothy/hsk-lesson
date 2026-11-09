@extends('layouts.app')
@section('title', $q !== '' ? "Search: $q" : 'Search')
@push('head')<link rel="stylesheet" href="/css/browse.css"><link rel="stylesheet" href="/css/search.css">@endpush
@section('content')
<div class="bw sr">
  <h1 class="sr-only">Search</h1>
  <form class="bw-search sr-box" role="search" action="{{ route('search') }}" method="get">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
    <input id="search-q" type="search" name="q" value="{{ $q }}" aria-label="Search" placeholder="Search 学 · xue · xué · xue2 · study" autocomplete="off" autocapitalize="off" spellcheck="false" @if ($q === '') autofocus @endif>
  </form>

  @if ($q === '')
    <p class="sr-hint">Type a character, pinyin (xue, xué, xue2) or an English word.</p>
  @elseif ($characters->isEmpty() && $words->isEmpty() && $lessons->isEmpty() && $readings->isEmpty())
    <p class="sr-hint">No results for “{{ $q }}”. Try another spelling, or <a href="{{ route('browse') }}">browse by HSK level</a>.</p>
  @else
    @if ($matched)<p class="sr-hint">{{ $matched }}</p>@endif
    @php $inLessons = $lessons->concat($readings); @endphp
    <div class="sr-cols">
      <div class="sr-main">
        @if ($characters->isNotEmpty())
          <section class="sr-card" aria-labelledby="s-chars">
            <h2 id="s-chars">Characters · {{ $characters->count() }}</h2>
            <div class="sr-tiles">
              @foreach ($characters as $c)
                <x-char-tile variant="soft" :large="true" :c="$c->c" :p="$c->p" :m="$c->m" :tone="$c->tone" :href="route('char', $c->c)" />
              @endforeach
            </div>
          </section>
        @endif

        @if ($words->isNotEmpty())
          <section class="sr-card sr-words" aria-labelledby="s-words">
            <h2 id="s-words">Words · {{ number_format($wordTotal) }}</h2>
            @foreach ($words->take(6) as $w)
              <x-word-row :word="$w" :tag="$w->level ? 'HSK '.($w->level === 7 ? '7–9' : $w->level) : null" :href="route('char', mb_substr($w->hanzi, 0, 1))" />
            @endforeach
            <a class="sr-more" href="{{ route('browse', ['q' => $q]) }}">Show all {{ number_format($wordTotal) }} words →</a>
          </section>
        @endif
      </div>

      <aside class="sr-side">
        <section class="sr-card" aria-labelledby="s-lessons">
          <h2 id="s-lessons">In your lessons · {{ $inLessons->count() }}</h2>
          @forelse ($inLessons as $l)
            <a class="sr-row" href="{{ $l->href }}"><b class="zh" lang="zh-Hans">{{ $l->zh }}</b><span>{{ $l->line }}</span></a>
          @empty
            <p class="sr-none">Not in any lesson or reading yet.</p>
          @endforelse
        </section>
        <section class="sr-card" aria-labelledby="s-guides">
          <h2 id="s-guides">Guides &amp; parts</h2>
          @if ($parts)
            <a class="sr-row sr-row-glyph" href="{{ route('parts', ['c' => $parts->c]) }}"><span class="zh" lang="zh-Hans">{{ $parts->c }}</span><span class="sr-row-t"><b>{{ $parts->name }}</b><span>{{ $parts->sub }}</span></span></a>
          @endif
          <a class="sr-row" href="{{ route('guide', 'tones-sandhi') }}"><b>Tones &amp; pinyin</b><span>{{ $characters->pluck('p')->filter()->unique()->take(4)->implode(' · ') ?: 'Tone marks, numbers and sandhi' }}</span></a>
        </section>
      </aside>
    </div>
  @endif
</div>
@endsection
