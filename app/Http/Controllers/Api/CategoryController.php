<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Word;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Category::orderBy('sort_order')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'key' => 'required|string|max:50|alpha_dash|unique:categories,key',
            'label' => 'required|string|max:100',
            'sort_order' => 'sometimes|integer|min:0',
        ]);
        $data['sort_order'] ??= (Category::max('sort_order') ?? 0) + 1;

        return response()->json(['data' => Category::create($data)], 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $category->update($request->validate([
            'label' => 'sometimes|string|max:100',
            'sort_order' => 'sometimes|integer|min:0',
        ]));

        return response()->json(['data' => $category]);
    }

    public function destroy(Category $category): JsonResponse
    {
        abort_if(Word::where('category', $category->key)->exists(), 422, 'Category is still used by words.');
        $category->delete();

        return response()->json(['deleted' => true]);
    }
}
