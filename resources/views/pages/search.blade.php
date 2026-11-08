@extends('layouts.app')
@section('title', $q !== '' ? "Search: $q" : 'Search')
@push('head')<link rel="stylesheet" href="/css/browse.css"><link rel="stylesheet" href="/css/search.css">@endpush
@section('content')
<x-page-head eyebrow="Characters" title="Search" />
<form class="browse-search" role="search" action="{{ route('search') }}" method="get">
  <label class="sr-only" for="search-q">Search</label>
  <input id="search-q" type="search" name="q" value="{{ $q }}" placeholder="Hanzi, pinyin or English" autocomplete="off" autocapitalize="off" spellcheck="false" @if($q === '') autofocus @endif>
  <button type="submit" class="btn">Search</button>
</form>

@if ($q === '')
  <p class="search-empty">Type a character, pinyin (xue, xué, xue2) or an English word.</p>
@elseif ($characters->isEmpty() && $words->isEmpty() && $lessons->isEmpty() && $readings->isEmpty())
  <p class="search-empty">No results for “{{ $q }}”. Try another spelling, or <a href="{{ route('browse') }}">browse by HSK level</a>.</p>
@else
  @if ($characters->isNotEmpty())
    <section class="search-sec" aria-labelledby="s-chars">
      <h2 id="s-chars">Characters <span>{{ $characters->count() }}</span></h2>
      <div class="search-tiles">
        @foreach ($characters as $c)
          <x-char-tile :c="$c->c" :p="$c->p" :m="$c->m" :tone="$c->tone" :href="route('char', $c->c)" />
        @endforeach
      </div>
    </section>
  @endif

  @if ($words->isNotEmpty())
    <section class="search-sec" aria-labelledby="s-words">
      <h2 id="s-words">Words <span>{{ $wordTotal }}</span></h2>
      <div class="search-list">
        @foreach ($words as $w)
          <x-word-row :word="$w" />
        @endforeach
      </div>
      @if ($wordTotal > $words->count())
        <p class="search-more"><a href="{{ route('browse', ['q' => $q]) }}">See all {{ number_format($wordTotal) }} words in Browse →</a></p>
      @endif
    </section>
  @endif

  @foreach (['lessons' => ['Lessons', $lessons], 'readings' => ['Readings', $readings]] as $id => [$label, $items])
    @if ($items->isNotEmpty())
      <section class="search-sec" aria-labelledby="s-{{ $id }}">
        <h2 id="s-{{ $id }}">{{ $label }} <span>{{ $items->count() }}</span></h2>
        <div class="search-cards">
          @foreach ($items as $i)
            <x-lesson-card :n="$i->n" :title="$i->title" :sub="$i->sub" :href="$i->href" />
          @endforeach
        </div>
      </section>
    @endif
  @endforeach
@endif
@endsection
