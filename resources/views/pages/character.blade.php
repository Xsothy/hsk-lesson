@extends('layouts.app')
@php
  $c = $d['char'];
  $lvl = fn ($l) => $l === 7 ? '7–9' : $l;
  $icon = [
    'replay' => '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    'speed' => '<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/>',
    'hint' => '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/>',
    'outline' => '<rect x="4" y="4" width="16" height="16" rx="3" stroke-dasharray="3 3"/><path d="M9 9h6v6H9z"/>',
  ];
@endphp
@section('title', $c.' ('.implode(', ', $d['pinyin'] ?? []).')')

@push('head')
<link rel="stylesheet" href="/css/character.css">
@endpush

@section('content')
<div class="cp" data-character-page data-char="{{ $c }}" data-radical="{{ $d['radical'] }}">
  <nav class="cp-crumbs" aria-label="Breadcrumb">
    <a href="{{ route('browse') }}">HSK &amp; Dictionary</a>
    @if ($d['hsk3_level'])<span aria-hidden="true">/</span><span>HSK {{ $lvl($d['hsk3_level']) }}</span>@endif
    <span aria-hidden="true">/</span><span class="zh" lang="zh-Hans" aria-current="page">{{ $c }}</span>
  </nav>

  <div class="cp-cols">
    {{-- LEFT: identity + strokes (first on phone) --}}
    <div class="cp-left">
      <section class="cp-hero">
        <div class="cp-hero-text">
          <span class="cp-py @if($tone) tone-{{ $tone }} @endif">{!! collect($d['pinyin'] ?? [])->map(fn ($p) => \App\Support\Pinyin::toneHtml($p, $c))->implode(' · ') !!}</span>
          <h1 class="cp-char zh" lang="zh-Hans">{{ $c }}</h1>
          @if ($meaning)<p class="cp-def">{{ $meaning }}</p>@endif
          <div class="cp-badges">
            @if ($d['hsk2_level'])<x-chip tone="green">HSK 2.0 · {{ $d['hsk2_level'] }}</x-chip>@endif
            @if ($d['hsk3_level'])<x-chip tone="gold">HSK 3.0 · {{ $lvl($d['hsk3_level']) }}</x-chip>@endif
            <x-chip data-stroke-count hidden></x-chip>
          </div>
        </div>
        <div class="cp-hero-actions">
          <button type="button" class="cp-round cp-round-red" data-say="{{ $c }}" aria-label="Play pronunciation">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>
          </button>
          <button type="button" class="cp-round" data-action="save" aria-pressed="false" aria-label="Save to my words">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>
          </button>
        </div>
      </section>

      {{-- 01 WRITE: the primary task --}}
      <section class="cp-card cp-write" aria-labelledby="sec-write">
        <div class="cp-head">
          <div>
            <span class="cp-kicker">01 · Write</span>
            <h2 id="sec-write" class="cp-h2" data-write-title>Watch it written</h2>
          </div>
          <div class="cp-pill" role="tablist" aria-label="Mode">
            <button type="button" role="tab" id="tab-watch" aria-controls="cp-stage" aria-selected="true" data-mode="watch">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>Watch
            </button>
            <button type="button" role="tab" id="tab-write" aria-controls="cp-stage" aria-selected="false" tabindex="-1" data-mode="write">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l4-1 10-10-3-3L5 16z"/></svg>Write
            </button>
          </div>
        </div>

        <div class="cp-stage" id="cp-stage" role="tabpanel" aria-labelledby="tab-watch">
          <x-writing-grid :char="$c" mode="watch" grid="mi" :stroke="0" :max="1" />
        </div>
        <p class="cp-feedback" role="status" data-feedback></p>

        <div class="cp-controls" data-group="watch">
          <button type="button" class="cp-ctl" data-action="replay"><span class="cp-ctl-i"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{!! $icon['replay'] !!}</svg></span>Replay</button>
          <button type="button" class="cp-ctl is-primary" data-action="toggle" aria-pressed="false"><span class="cp-ctl-i">
            <svg class="i-play" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z"/></svg>
            <svg class="i-pause" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
          </span><span data-label>Pause</span></button>
          <button type="button" class="cp-ctl" data-action="speed"><span class="cp-ctl-i"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{!! $icon['speed'] !!}</svg></span><span data-label>Speed 1×</span></button>
        </div>
        <div class="cp-controls" data-group="write" hidden>
          <button type="button" class="cp-ctl" data-action="hint"><span class="cp-ctl-i"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{!! $icon['hint'] !!}</svg></span>Hint</button>
          <button type="button" class="cp-ctl" data-action="outline" aria-pressed="true"><span class="cp-ctl-i"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{!! $icon['outline'] !!}</svg></span>Outline</button>
          <button type="button" class="cp-ctl is-primary" data-action="retry"><span class="cp-ctl-i"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{!! $icon['replay'] !!}</svg></span>Retry</button>
        </div>
      </section>

      {{-- 02 STROKE ORDER: step through --}}
      <section class="cp-card cp-strokes" aria-labelledby="sec-strokes" data-strokes>
        <div class="cp-head">
          <div>
            <span class="cp-kicker">02 · Stroke order</span>
            <h2 id="sec-strokes" class="cp-h2" data-step-title>Stroke order</h2>
          </div>
          <div class="cp-steppers">
            <button type="button" class="cp-step" data-step="-1" aria-label="Previous stroke" disabled>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button type="button" class="cp-step is-dark" data-step="1" aria-label="Next stroke" disabled>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
            </button>
          </div>
        </div>
        <div class="cp-bar" role="progressbar" aria-label="Stroke progress" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0"><i data-step-bar></i></div>
        <div class="cp-cells" data-cells></div>
        <p class="cp-tip" data-step-tip>Loading stroke data…</p>
      </section>
    </div>

    {{-- RIGHT: context (after strokes on phone) --}}
    <div class="cp-right">
      <div class="cp-head cp-details-head">
        <div>
          <span class="cp-kicker">03 · Details</span>
          <h2 class="cp-h2">Meaning, words &amp; where you learn it</h2>
        </div>
      </div>

      <section class="cp-card" aria-labelledby="sec-lessons">
        <h3 id="sec-lessons" class="cp-h3">Taught in your lessons <span class="zh" lang="zh-Hans">课程</span></h3>
        @if ($lessons)
          <div class="cp-lessons">
            @foreach ($lessons as $l)
              <a class="cp-lesson" href="{{ $l['href'] }}">
                <span class="cp-lesson-t"><b class="zh" lang="zh-Hans">{{ $l['zh_title'] }}</b><small>Lesson {{ $l['number'] }} · {{ $l['en_title'] }}</small></span>
                @if ($l['in_vocab'])<span class="cp-tag">vocab</span>@endif
              </a>
            @endforeach
          </div>
        @else
          <p class="cp-empty">Not in a lesson yet.</p>
        @endif
      </section>

      @if ($d['words'])
        <section class="cp-card" aria-labelledby="sec-words">
          <h3 id="sec-words" class="cp-h3">Words with <span class="zh" lang="zh-Hans">{{ $c }}</span></h3>
          <div class="cp-rows">
            @foreach ($d['words'] as $w)
              <x-word-row :word="['hanzi' => $w['word'], 'pinyin' => $w['pinyin'], 'english' => $w['meaning']]"
                          :tag="$w['hsk3_level'] ? 'HSK '.$lvl($w['hsk3_level']) : null" />
            @endforeach
          </div>
        </section>
      @endif

      @if ($examples)
        <section class="cp-card" aria-labelledby="sec-examples">
          <h3 id="sec-examples" class="cp-h3">Examples from your lessons</h3>
          <ul class="cp-examples">
            @foreach ($examples as $e)
              <li>
                <span class="cp-ex-t">
                  <span class="cp-ex-zh zh" lang="zh-Hans">{!! str_replace(e($c), '<mark>'.e($c).'</mark>', e($e['zh'])) !!}</span>
                  @if ($e['en'])<span class="cp-ex-en">{{ $e['en'] }}</span>@endif
                  @if ($e['href'])<a class="cp-ex-src" href="{{ $e['href'] }}">{{ $e['source'] }}</a>@else<span class="cp-ex-src">{{ $e['source'] }}</span>@endif
                </span>
                <button type="button" class="cp-play" data-say="{{ $e['zh'] }}" aria-label="Play sentence">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                </button>
              </li>
            @endforeach
          </ul>
        </section>
      @endif

      <section class="cp-card cp-facts-card" aria-labelledby="sec-facts">
        <div>
          <h3 id="sec-facts" class="cp-h3">Character facts</h3>
          <dl class="cp-facts">
            @foreach ($facts as $k => $v)
              <dt>{{ $k }}</dt>
              <dd>
                @if ($k === 'Radical')
                  <a class="zh" lang="zh-Hans" href="{{ route('char', $v['char']) }}">{{ $v['char'] }}</a>@if($v['meaning']) {{ $v['meaning'] }}@endif
                @elseif ($k === 'Parts')
                  @foreach ($v as $p)<span class="zh" lang="zh-Hans">{{ $p }}</span>@if(! $loop->last) + @endif @endforeach
                @else
                  {{ $v }}
                @endif
              </dd>
            @endforeach
          </dl>
        </div>
        @if ($note)<p class="cp-note">{{ $note }}</p>@endif
      </section>

      @if ($related)
        <section class="cp-card" aria-labelledby="sec-related">
          <h3 id="sec-related" class="cp-h3">Related characters</h3>
          @foreach ($related as $g)
            <div class="cp-rel">
              <span class="cp-rel-t">{{ $g['title'] }}</span>
              <div class="cp-rel-grid">
                @foreach ($g['items'] as $r)
                  <x-char-tile :c="$r['char']" :p="$r['pinyin']" variant="compact" :href="route('char', $r['char'])" title="{{ $r['meaning'] }}" />
                @endforeach
              </div>
            </div>
          @endforeach
        </section>
      @endif
    </div>
  </div>
</div>
@endsection

@push('scripts')
<script src="/js/store.js"></script>
<script src="https://cdn.jsdelivr.net/npm/hanzi-writer@3.7.2/dist/hanzi-writer.min.js"></script>
<script src="/js/character.js"></script>
@endpush
