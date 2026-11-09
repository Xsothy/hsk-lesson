{{-- Browse word list: status filter (All / To learn / Known), List · Grid · Practise · PDF, then the list card or the tile grid. --}}
@php
  $pdf = $practice ? route('worksheet', $practice) : route('worksheet', ['chars' => mb_substr(implode('', array_unique(mb_str_split($items->pluck('hanzi')->implode('')))), 0, 60)]);
@endphp
<section class="browse-results" aria-labelledby="results-title" data-practice="{{ http_build_query($practice) }}">
  <h2 id="results-title" class="{{ $q !== '' ? 'bw-results-t' : 'sr-only' }}">{{ $title }}</h2>
  <div class="bw-bar">
    <div class="bw-group" role="group" aria-label="Show">
      <button type="button" class="bw-btn" data-filter="all" aria-pressed="true">All <span data-count="all">{{ $items->count() }}</span></button>
      <button type="button" class="bw-btn" data-filter="learn" aria-pressed="false">To learn <span data-count="learn"></span></button>
      <button type="button" class="bw-btn" data-filter="known" aria-pressed="false">Known <span data-count="known"></span></button>
    </div>
    <div class="bw-group" role="group" aria-label="View">
      <button type="button" class="bw-btn bw-view" data-view="list" aria-pressed="true">List</button>
      <button type="button" class="bw-btn bw-view" data-view="grid" aria-pressed="false">Grid</button>
      <a class="bw-btn is-red practise" href="{{ route('practice', $practice) }}">Practise</a>
      <a class="bw-btn bw-pdf" href="{{ $pdf }}">PDF</a>
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
      @if ($paginator->onFirstPage())<span class="bw-btn is-disabled" aria-disabled="true">‹ Prev</span>@else<a class="bw-btn" href="{{ $paginator->previousPageUrl() }}" rel="prev">‹ Prev</a>@endif
      <span class="pager-n">Page {{ $paginator->currentPage() }} of {{ $paginator->lastPage() }}</span>
      @if ($paginator->hasMorePages())<a class="bw-btn" href="{{ $paginator->nextPageUrl() }}" rel="next">Next ›</a>@else<span class="bw-btn is-disabled" aria-disabled="true">Next ›</span>@endif
    </nav>
  @endif
</section>
