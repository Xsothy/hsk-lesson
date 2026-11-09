@extends('layouts.app')
@section('title', 'Courses')
@push('head')<link rel="stylesheet" href="/css/learn.css"><link rel="stylesheet" href="/css/courses.css"><meta name="csrf-token" content="{{ csrf_token() }}">@endpush
@section('content')
@php
  use App\Http\Controllers\LearnController as LC;
  $pen = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l4-1 10-10-3-3L5 16z"/></svg>';
  $cards = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="4" width="13" height="16" rx="2"/><path d="M4 7v11a2 2 0 0 0 2 2"/></svg>';
  $print = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v7H7z"/></svg>';
  $ring = fn () => '<span class="cr-ring" aria-hidden="true"><span>0%</span></span>';
@endphp
<div class="lp courses">
  <div class="cr-head">
    <h1>Courses <span class="zh-sub zh" lang="zh-Hans">课程</span></h1>
    <p>Study by our lessons, by official HSK level, or by your own textbook.</p>
  </div>

  <div class="cr-bar">
    <nav class="cr-tabs" aria-label="Course">
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
    @foreach ([2 => '2.0', 3 => '3.0'] as $v => $c)
      @php
        $ls = $courses[$v];
        $groups = $v === 2 ? $ls->groupBy(fn ($l) => $l->n <= 12 ? 1 : 2) : collect();
        $words = $ls->flatMap(fn ($l) => $l->vocab)->unique();
      @endphp
      <div class="hsk-v{{ $v }} cr-course" data-course="{{ $c }}">
        <section class="cr-over">
          <div class="cr-id">
            <span class="cr-glyph zh {{ $v === 2 ? 'g-orange' : 'g-blue' }}" lang="zh-Hans" aria-hidden="true">课</span>
            <div class="cr-name"><b>Our course · HSK {{ $c }}</b><span>{{ $v === 2 ? 'Our own lessons with grammar, dialogues and readings · HSK 1–2' : 'New lessons built on the HSK 3.0 syllabus · coming next' }}</span></div>
          </div>
          <div class="cr-stats">
            <div><b>{{ $v === 2 ? $groups->count() : count(LC::levels(3)) }}</b><span>levels</span></div>
            <div><b>{{ $words->count() ? number_format($words->count()) : '—' }}</b><span>words</span></div>
            <div><b class="cr-known" @if($words->count()) data-known-words="{{ json_encode($words->values(), JSON_UNESCAPED_UNICODE) }}" @endif>{{ $words->count() ? '0' : '—' }}</b><span>known</span></div>
          </div>
        </section>
        <div class="cr-levels" data-levels>
          <nav class="cr-lv" aria-label="Levels">
            @if ($v === 2)
              @foreach ($groups as $lv => $g)
                <button type="button" class="cr-lvb" data-lv="{{ $loop->index }}" aria-pressed="{{ $loop->first ? 'true' : 'false' }}"
                  data-words="{{ json_encode($g->flatMap(fn ($l) => $l->vocab)->unique()->values(), JSON_UNESCAPED_UNICODE) }}">
                  <span class="cr-lvt"><b>HSK {{ $lv }} · Lessons {{ $g->first()->n }}–{{ $g->last()->n }}</b><span>{{ $g->count() }} lessons · {{ $g->flatMap(fn ($l) => $l->vocab)->unique()->count() }} words</span></span>{!! $ring() !!}
                </button>
              @endforeach
            @else
              @foreach (LC::levels(3) as $lv)
                <button type="button" class="cr-lvb" data-lv="{{ $loop->index }}" aria-pressed="{{ $loop->first ? 'true' : 'false' }}">
                  <span class="cr-lvt"><b>Level {{ LC::levelLabel(3, $lv) }}</b><span>Planned</span></span>{!! $ring() !!}
                </button>
              @endforeach
            @endif
          </nav>
          @if ($v === 2)
            @foreach ($groups as $lv => $g)
              <section class="cr-panel" data-panel="{{ $loop->index }}" @unless($loop->first) hidden @endunless>
                <div class="cr-ph">
                  <div><span class="cr-eb">OUR COURSE · HSK 2.0</span><h2>HSK {{ $lv }} · Lessons {{ $g->first()->n }}–{{ $g->last()->n }}</h2></div>
                  <div class="cr-acts">
                    <a class="pill-btn" href="{{ route('practice', ['lesson' => $g->first()->slug]) }}">{!! $pen !!}Practise all</a>
                    <a class="cr-ic" href="{{ route('review') }}" aria-label="Flashcards for this level">{!! $cards !!}</a>
                    <a class="cr-ic" href="{{ route('worksheet') }}" aria-label="Print this level">{!! $print !!}</a>
                  </div>
                </div>
                <div class="cr-rows">
                  @foreach ($g as $l)
                    <a class="cr-row lesson-row" href="{{ route('lesson', $l->slug) }}" data-words="{{ json_encode($l->vocab, JSON_UNESCAPED_UNICODE) }}">
                      <span class="cr-num">{{ $l->n }}</span>
                      <span class="cr-rt"><b class="zh" lang="zh-Hans">{{ $l->zh }}</b><span>{{ $l->title }}</span></span>
                      <span class="cr-count">{{ count($l->vocab) }} words</span>
                      <span class="cr-tag">Start</span>
                    </a>
                  @endforeach
                </div>
              </section>
            @endforeach
          @else
            @foreach (LC::levels(3) as $lv)
              <section class="cr-panel" data-panel="{{ $loop->index }}" @unless($loop->first) hidden @endunless>
                <div class="cr-ph"><div><span class="cr-eb">OUR COURSE · HSK 3.0 · COMING NEXT</span><h2>Level {{ LC::levelLabel(3, $lv) }} · lessons planned</h2></div></div>
                <p class="cr-empty">Our HSK 3.0 lessons for this level aren’t written yet. Until then, study the official HSK 3.0 word lists under <a href="{{ route('courses', ['tab' => 'hsk']) }}">HSK levels</a>, or switch to HSK 2.0 in Settings for our current 24 lessons.</p>
              </section>
            @endforeach
          @endif
        </div>
      </div>
    @endforeach

  @elseif ($tab === 'textbooks')
    <section class="cr-over">
      <div class="cr-id">
        <span class="cr-glyph zh g-gold" lang="zh-Hans" aria-hidden="true">书</span>
        <div class="cr-name"><b>Textbooks</b><span>Follow the book you study with, lesson by lesson</span></div>
      </div>
      <div class="cr-stats">
        <div><b id="tb-count-lists">0</b><span>lists</span></div>
        <div><b id="tb-count-words">—</b><span>words</span></div>
        <div><b class="cr-known">—</b><span>known</span></div>
      </div>
    </section>
    <div class="tb-grid">
      @foreach ([['Your own textbook', 'Any book or class word list', 'c-muted']] as [$name, $meta, $cover])
        <div class="tb-card">
          <div class="tb-ct"><span class="tb-cover {{ $cover }}" aria-hidden="true"></span><span class="tb-cn"><b>{{ $name }}</b><span>{{ $meta }}</span></span></div>
          <span class="cr-tag">Word lists not added yet</span>
          <a class="tb-cta" href="#tb-add">Add word lists</a>
        </div>
      @endforeach
    </div>
    <p class="tb-note">Textbook word lists belong to their publishers, so they aren’t bundled. Add the lists for the books you own — paste them here or let an agent import them through the content API — and each lesson gets writing practice, flashcards and worksheets like the rest of the app.</p>
    <section class="tb" data-textbooks>
      <div class="tb-import" id="tb-add">
        <p class="muted">Paste or upload a list — one word per line, or <code>hanzi,pinyin,meaning</code>. Missing pinyin and meanings are filled in from the HSK and dictionary data. Lists stay in your browser (and sync with your account).</p>
        <label class="tb-label" for="tb-name">List name</label>
        <input id="tb-name" class="tb-input" type="text" maxlength="60" placeholder="e.g. Book 1 · Lesson 3" autocomplete="off">
        <label class="tb-label" for="tb-text">Words</label>
        <textarea id="tb-text" class="tb-input tb-text" rows="6" placeholder="学习&#10;你好,nǐ hǎo,hello&#10;朋友"></textarea>
        <div class="tb-actions">
          <label class="btn tb-file"><x-icon name="book" :size="20" /> Upload CSV<input id="tb-file" type="file" accept=".csv,.txt,text/csv,text/plain" hidden></label>
          <button type="button" class="pill-btn" id="tb-import"><x-icon name="arrow-right" :size="20" /> Import list</button>
        </div>
        <p class="tb-status muted" id="tb-status" role="status" aria-live="polite"></p>
      </div>
      <div id="tb-lists" class="tb-lists" aria-live="polite"></div>
      <p class="muted" id="tb-empty" hidden>No lists yet. Import one above.</p>
      <template id="tb-row"><x-word-row :word="['hanzi' => '', 'pinyin' => '', 'english' => '']" :audio="false" /></template>
    </section>

  @else
    @foreach ([2, 3] as $v)
      @php $lvls = LC::levels($v); $total = array_sum($counts[$v]); @endphp
      <div class="hsk-v{{ $v }} cr-course">
        <section class="cr-over">
          <div class="cr-id">
            <span class="cr-glyph zh {{ $v === 2 ? 'g-green' : 'g-blue' }}" lang="zh-Hans" aria-hidden="true">{{ $v === 2 ? '旧' : '新' }}</span>
            <div class="cr-name"><b>HSK {{ $v }}.0</b><span>{{ $v === 2 ? 'Official word lists · 6 levels · used in exams until mid-2026' : 'Official word lists · 9 levels · recognition & writing targets' }}</span></div>
          </div>
          <div class="cr-stats">
            <div><b>{{ $v === 2 ? 6 : 9 }}</b><span>levels</span></div>
            <div><b>{{ number_format($total) }}</b><span>words</span></div>
            <div><b class="cr-known" data-hsk-known="{{ $v }}">0</b><span>known</span></div>
          </div>
        </section>
        <div class="cr-levels" data-levels>
          <nav class="cr-lv" aria-label="Levels">
            @foreach ($lvls as $lv)
              <button type="button" class="cr-lvb" data-lv="{{ $loop->index }}" data-version="{{ $v }}" data-level="{{ $lv }}" aria-pressed="{{ $loop->first ? 'true' : 'false' }}">
                <span class="cr-lvt"><b>Level {{ LC::levelLabel($v, $lv) }}</b><span>{{ number_format($counts[$v][$lv] ?? 0) }} words</span></span>{!! $ring() !!}
              </button>
            @endforeach
          </nav>
          @foreach ($lvls as $lv)
            <section class="cr-panel" data-panel="{{ $loop->index }}" data-version="{{ $v }}" data-level="{{ $lv }}" @unless($loop->first) hidden @endunless>
              <div class="cr-ph">
                <div><span class="cr-eb">HSK {{ $v }}.0</span><h2>Level {{ LC::levelLabel($v, $lv) }} · {{ number_format($counts[$v][$lv] ?? 0) }} words</h2></div>
                <div class="cr-acts">
                  <a class="pill-btn" href="{{ route('practice', ['version' => $v, 'level' => $lv]) }}">{!! $pen !!}Practise all</a>
                  <a class="cr-ic" href="{{ route('review', ['version' => $v, 'level' => $lv]) }}" aria-label="Flashcards for this level">{!! $cards !!}</a>
                  <a class="cr-ic" href="{{ route('worksheet') }}" aria-label="Print this level">{!! $print !!}</a>
                </div>
              </div>
              <div class="cr-rows sets" aria-live="polite"><span class="muted">Loading…</span></div>
            </section>
          @endforeach
        </div>
      </div>
    @endforeach
  @endif
</div>
@endsection
@push('scripts')<script src="/js/store.js"></script><script src="/js/learn.js"></script>@if ($tab === 'textbooks')<script src="/js/textbooks.js"></script>@endif @endpush
