@extends('layouts.app')
@section('title', 'Guides')
@push('head')<link rel="stylesheet" href="/css/learn.css"><link rel="stylesheet" href="/css/guides.css">@endpush
@section('content')
@include('pages.guides._page')
@endsection
