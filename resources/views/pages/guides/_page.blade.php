{{-- Guides layout (Guides.dc.html): grouped topic list beside the article. $all: guides for the list; $guide: the open one (or null). --}}
@php
  $groups = collect($all)->groupBy(fn ($g) => str_contains($g['title'], ' vs ') ? 'EASY TO CONFUSE' : 'START HERE')->sortKeysDesc();
@endphp
<div class="lp guides">
  <h1>Guides <span class="zh-sub zh" lang="zh-Hans">指南</span></h1>
  <div class="gd-body">
    <nav class="gd-nav" aria-label="Guides">
      @forelse ($groups as $title => $items)
        <div class="gd-group">
          <span class="gd-gt">{{ $title }}</span>
          <div class="gd-row">
            @foreach ($items as $g)
              <a class="guide-card gd-item @if($guide && $guide['slug'] === $g['slug']) is-on @endif" href="{{ route('guide', $g['slug']) }}" @if($guide && $guide['slug'] === $g['slug']) aria-current="page" @endif>
                <b>{{ $g['title'] }}</b><span class="gd-sub">{{ $g['summary'] }}</span>
              </a>
            @endforeach
          </div>
        </div>
      @empty
        <p class="muted">No guides match that filter.</p>
      @endforelse
    </nav>
    @if ($guide)
      <article class="gd-article">
        <h2>{{ $guide['title'] }}</h2>
        <p class="gd-lead">{{ $guide['summary'] }}</p>
        <div class="guide-body">{!! $guide['html'] !!}</div>
      </article>
    @endif
  </div>
</div>
