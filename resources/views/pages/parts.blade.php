@extends('layouts.app')
@section('title', 'Character parts')
@push('head')<link rel="stylesheet" href="/css/parts.css">@endpush
@section('content')
<div class="pt" data-parts-page>
  <div class="pt-head">
    <h1>Character parts <span class="zh" lang="zh-Hans">部件</span></h1>
    <p>Spot a part, guess the meaning or the sound, then confirm on the character page.</p>
  </div>

  <div class="pt-cols">
    @if ($sel)
      <section class="pt-detail" aria-labelledby="pt-name" data-part-detail="{{ $sel['char'] }}">
        <div class="pt-id">
          <span class="pt-big zh pt-k-{{ $sel['kind'] }}" lang="zh-Hans">{{ $sel['char'] }}</span>
          <div class="pt-id-t">
            <span class="pt-tag pt-k-{{ $sel['kind'] }}">{{ ['meaning' => 'Meaning clue', 'sound' => 'Sound clue', 'part' => 'Part'][$sel['kind']] }}</span>
            <h2 id="pt-name">{{ $sel['name'] }}</h2>
            <span class="pt-sub">@if ($sel['pinyin']){!! \App\Support\Pinyin::toneHtml($sel['pinyin'], $sel['char']) !!} · @endif{{ $sel['hint'] }}</span>
          </div>
        </div>
        <p class="pt-about">{{ $sel['about'] }}</p>
        <span class="pt-label">Read the pattern</span>
        <div class="pt-ex">
          @foreach ($sel['examples'] as $e)
            <a href="{{ route('char', $e['char']) }}" data-example="{{ $e['char'] }}">
              <span class="zh" lang="zh-Hans">{{ $e['char'] }}</span>
              <span class="pt-ex-t"><span class="pt-ex-p">{{ $e['pinyin'] }}</span><span class="pt-ex-m">{{ $e['meaning'] }}</span></span>
            </a>
          @endforeach
        </div>
        @php $chars = array_column($sel['examples'], 'char'); @endphp
        <div class="pt-actions">
          <a class="pt-btn is-red" href="{{ route('practice', ['words' => implode(',', $chars)]) }}">Practise these characters</a>
          <button type="button" class="pt-btn" data-add-cards="{{ implode(',', $chars) }}" aria-pressed="false">Add to flashcards</button>
        </div>
      </section>
    @else
      <section class="pt-detail pt-none" aria-live="polite">
        <p>No parts match “{{ $q }}”. Try a meaning in English (water), a part (<span class="zh" lang="zh-Hans">氵</span>) or pinyin (qing).</p>
      </section>
    @endif

    <section class="pt-explore" aria-label="Parts">
      <form class="pt-search" role="search" action="{{ route('parts') }}" method="get">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
        @if ($kind !== 'all')<input type="hidden" name="kind" value="{{ $kind }}">@endif
        <input type="search" name="q" value="{{ $q }}" aria-label="Search parts" placeholder="Search water, 氵, qing…" autocomplete="off" autocapitalize="off" spellcheck="false">
      </form>
      <nav class="pt-filters" aria-label="Filter parts">
        @foreach ($filters as $k => $label)
          <x-chip :href="route('parts', array_filter(['kind' => $k === 'all' ? null : $k, 'q' => $q === '' ? null : $q]))" :active="$kind === $k">{{ $label }}</x-chip>
        @endforeach
      </nav>
      @if ($items)
        <div class="pt-grid">
          @foreach ($items as $i)
            @php $on = $sel && $sel['char'] === $i['char']; @endphp
            <a href="{{ $link(['c' => $i['char']]) }}" class="pt-item @if ($on) is-on @endif" @if ($on) aria-current="true" @endif data-part="{{ $i['char'] }}" data-kind="{{ $i['kind'] }}">
              <span class="zh" lang="zh-Hans">{{ $i['char'] }}</span>
              <span class="pt-item-h">{{ $i['kind'] === 'sound' ? 'sounds like '.\App\Support\Pinyin::toneless($i['pinyin']) : $i['gloss'] }}</span>
            </a>
          @endforeach
        </div>
        @if (! $all && $total > count($items))
          <a class="pt-more" href="{{ $link(['all' => 1, 'c' => $sel['char'] ?? null]) }}">Show all {{ $total }} parts</a>
        @endif
      @else
        <p class="pt-empty">No parts found.</p>
      @endif
    </section>
  </div>
</div>
@endsection
@push('scripts')<script src="/js/store.js"></script><script src="/js/parts.js"></script>@endpush
