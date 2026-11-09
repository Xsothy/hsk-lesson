@extends('layouts.app')
@section('title', $q !== '' ? "Search: $q" : 'HSK & Dictionary')
@push('head')<link rel="stylesheet" href="/css/browse.css">@endpush
@section('content')
@if (! request()->hasAny(['tab', 'version', 'q']))
<script>/* No tab chosen: open the HSK list for the version picked in Settings. */
if (document.documentElement.getAttribute('data-hsk') === '3') location.replace('{{ route('browse', ['tab' => 'hsk3']) }}');</script>
@endif
<div class="bw">
  <h1 class="bw-h1">HSK &amp; Dictionary <span class="zh" lang="zh-Hans">词典</span></h1>

  <form class="bw-search" role="search" action="{{ route('browse') }}" method="get">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
    <input id="browse-q" type="search" name="q" value="{{ $q }}" aria-label="Search the dictionary" placeholder="Search 学 · xue · xué · xue2 · study" autocomplete="off" autocapitalize="off" spellcheck="false">
  </form>

  <nav class="bw-tabs" aria-label="Browse by">
    @foreach (\App\Http\Controllers\BrowseController::TABS as $key => $label)
      <x-chip :class="match ($key) { 'hsk2' => 'hsk-v2', 'hsk3' => 'hsk-v3', default => null }" :href="route('browse', ['tab' => $key])" :active="$tab === $key">{{ $label }}</x-chip>
    @endforeach
  </nav>

  @if ($tab === 'hsk2' || $tab === 'hsk3')
    <div class="bw-hsk">
      <nav class="bw-levels" aria-label="Level">
        @foreach ($levels as $lv)
          @php $on = $lv === $level && ! $set; @endphp
          <a class="bw-level @if ($lv === $level) is-on @endif" href="{{ route('browse', ['tab' => $tab, 'level' => $lv]) }}" @if ($on) aria-current="true" @endif>
            <b>Level {{ \App\Http\Controllers\LearnController::levelLabel($version, $lv) }}</b><span>{{ number_format($levelCounts[$lv]) }} words</span>
          </a>
        @endforeach
      </nav>
      @if ($set)
        <p class="bw-note">Study set {{ $set }} of {{ $sets }} from <a href="{{ route('courses', ['tab' => $tab]) }}">Courses</a> ·
          <a href="{{ route('browse', ['tab' => $tab, 'level' => $level]) }}">Show whole level</a></p>
      @endif
      @include('pages.partials.browse-results')
    </div>
  @elseif ($tab === 'pinyin')
    <section class="bw-card bw-pinyin" aria-label="Characters by pinyin">
      @if ($syl)
        <nav class="bw-tones" aria-label="Tone">
          <a class="bw-btn @if (! $tone) is-red @endif" href="{{ route('browse', ['tab' => 'pinyin', 'syl' => $syl]) }}" @if (! $tone) aria-current="true" @endif>All tones</a>
          @foreach ($toneCounts as $t => $n)
            <a class="bw-btn tone-{{ $t }} @if ($tone === $t) is-on @endif" href="{{ route('browse', ['tab' => 'pinyin', 'syl' => $syl, 'tone' => $t]) }}" @if ($tone === $t) aria-current="true" @endif
               aria-label="{{ $t === 5 ? 'Neutral' : 'Tone '.$t }} · {{ $n }}">{{ $toneLabels[$t] ?? $syl }} {{ $t === 5 ? '·' : $t }}</a>
          @endforeach
        </nav>
        <h2 class="sr-only" id="results-title">{{ $title }}</h2>
        <div class="bw-sound">
          @foreach ($items as $it)
            <a href="{{ route('char', $it->hanzi) }}" data-word="{{ $it->hanzi }}">
              <span class="zh" lang="zh-Hans">{{ $it->hanzi }}</span>
              <span class="bw-sound-t"><span class="@if ($it->tone) tone-{{ $it->tone }} @endif">{{ $it->pinyin }}</span><span>{{ $it->short }}</span></span>
            </a>
          @endforeach
        </div>
      @else
        <p class="bw-pick">Pick a syllable to see its characters, then filter by tone.</p>
      @endif
      <details class="bw-az" @if (! $syl) open @endif>
        <summary>{{ $syl ? 'Syllables A–Z: a · ba · ca · … · '.$syl.' · … · zuo' : 'Pick a syllable' }}</summary>
        @foreach ($groups as $letter => $syllables)
          <div class="bw-az-g">
            <h3>{{ strtoupper($letter) }}</h3>
            <div class="bw-az-items">
              @foreach ($syllables as $s => $n)
                <a class="@if ($s === $syl) is-on @endif" href="{{ route('browse', ['tab' => 'pinyin', 'syl' => $s]) }}" @if ($s === $syl) aria-current="true" @endif aria-label="{{ $s }}, {{ $n }} characters">{{ $s }}</a>
              @endforeach
            </div>
          </div>
        @endforeach
      </details>
    </section>
  @elseif ($tab === 'radical')
    <section class="bw-card bw-radicals" aria-label="Pick a radical">
      @foreach ($groups as $strokes => $radicals)
        <div class="bw-rad-g">
          <h2>{{ $strokes === 99 ? 'Other' : $strokes.' '.str('stroke')->plural($strokes) }}</h2>
          <div class="bw-rad-items">
            @foreach ($radicals as $r => $n)
              <a class="@if ($r === $radical) is-on @endif" href="{{ route('browse', ['tab' => 'radical', 'r' => $r]) }}" @if ($r === $radical) aria-current="true" @endif aria-label="{{ $r }}, {{ $n }} characters">
                <b class="zh" lang="zh-Hans">{{ $r }}</b><span>{{ $radPinyin[$r] ?? '' }}</span>
              </a>
            @endforeach
          </div>
        </div>
      @endforeach
    </section>
    @if ($radical)
      @include('pages.partials.browse-results')
    @endif
  @else
    @include('pages.partials.browse-results')
  @endif
</div>
@endsection
@push('scripts')<script src="/js/store.js"></script><script src="/js/browse.js"></script>@endpush
