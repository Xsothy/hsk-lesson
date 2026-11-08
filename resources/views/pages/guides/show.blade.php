@extends('layouts.app')
@section('title', $guide['title'])
@push('head')<link rel="stylesheet" href="/css/guides.css">@endpush
@section('content')
<x-page-head :eyebrow="'Guide · '.ucfirst($guide['level'])" :title="$guide['title']" :sub="$guide['summary']" />
<article class="guide-body">{!! $guide['html'] !!}</article>
<p class="guide-back"><a href="{{ route('guides') }}">← All guides</a></p>
@endsection
