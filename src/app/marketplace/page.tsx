'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Download, Heart, Search, Filter, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/lib/store';

interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  author: {
    id: string;
    name: string;
    image?: string;
  };
  previewImage: string;
  price: number;
  isPremium: boolean;
  averageRating: number;
  totalRatings: number;
  downloads: number;
  tags: string[];
  version: string;
  license: string;
  createdAt: string;
  reviews: {
    id: string;
    rating: number;
    comment: string;
    user: {
      name: string;
      image?: string;
    };
    createdAt: string;
  }[];
}

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<MarketplaceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [selectedTemplate, setSelectedTemplate] = useState<MarketplaceTemplate | null>(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });

  const { user } = useAppStore();

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterAndSortTemplates();
  }, [templates, searchQuery, selectedCategory, priceFilter, sortBy]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/marketplace/templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortTemplates = () => {
    let filtered = [...templates];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Price filter
    if (priceFilter === 'free') {
      filtered = filtered.filter(template => template.price === 0);
    } else if (priceFilter === 'premium') {
      filtered = filtered.filter(template => template.price > 0);
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        filtered.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'rating':
        filtered.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
    }

    setFilteredTemplates(filtered);
  };

  const handlePurchase = async (templateId: string, price: number) => {
    if (!user) {
      alert('Please login to purchase templates');
      return;
    }

    try {
      const response = await fetch('/api/marketplace/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, price })
      });

      if (response.ok) {
        alert('Template purchased successfully!');
        fetchTemplates(); // Refresh to update purchase status
      } else {
        throw new Error('Purchase failed');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Purchase failed. Please try again.');
    }
  };

  const handleFavorite = async (templateId: string) => {
    if (!user) {
      alert('Please login to favorite templates');
      return;
    }

    try {
      const response = await fetch('/api/marketplace/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId })
      });

      if (response.ok) {
        fetchTemplates(); // Refresh to update favorite status
      }
    } catch (error) {
      console.error('Favorite error:', error);
    }
  };

  const submitReview = async () => {
    if (!user || !selectedTemplate) return;

    try {
      const response = await fetch('/api/marketplace/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          rating: newReview.rating,
          comment: newReview.comment
        })
      });

      if (response.ok) {
        setReviewDialog(false);
        setNewReview({ rating: 5, comment: '' });
        fetchTemplates(); // Refresh to show new review
        alert('Review submitted successfully!');
      }
    } catch (error) {
      console.error('Review error:', error);
      alert('Failed to submit review');
    }
  };

  const renderStars = (rating: number, interactive = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
            onClick={() => interactive && onRatingChange && onRatingChange(star)}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading marketplace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Template Marketplace</h1>
        <p className="text-gray-600">Discover and purchase premium templates from our community</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="portfolio">Portfolio</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="blog">Blog</SelectItem>
            <SelectItem value="ecommerce">E-commerce</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priceFilter} onValueChange={setPriceFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Price" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Prices</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="group hover:shadow-lg transition-shadow">
            <CardHeader className="p-0">
              <div className="relative">
                <img
                  src={template.previewImage}
                  alt={template.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                {template.isPremium && (
                  <Badge className="absolute top-2 right-2 bg-yellow-500 text-white">
                    Premium
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 left-2 bg-white/80 hover:bg-white"
                  onClick={() => handleFavorite(template.id)}
                >
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={template.author.image} />
                  <AvatarFallback>
                    {template.author.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-600">{template.author.name}</span>
              </div>

              <CardTitle className="text-lg mb-2">{template.name}</CardTitle>
              <CardDescription className="text-sm mb-3 line-clamp-2">
                {template.description}
              </CardDescription>

              <div className="flex items-center gap-2 mb-3">
                {renderStars(template.averageRating || 0)}
                <span className="text-sm text-gray-600">
                  ({template.totalRatings})
                </span>
                <div className="flex items-center gap-1 ml-auto text-sm text-gray-600">
                  <Download className="h-3 w-3" />
                  {template.downloads}
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {template.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>

            <CardFooter className="p-4 pt-0 flex justify-between items-center">
              <div className="font-semibold">
                {template.price === 0 ? 'Free' : `$${template.price}`}
              </div>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setSelectedTemplate(template)}>
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{template.name}</DialogTitle>
                      <DialogDescription>{template.description}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <img
                        src={template.previewImage}
                        alt={template.name}
                        className="w-full h-64 object-cover rounded-lg"
                      />
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><strong>Version:</strong> {template.version}</div>
                        <div><strong>License:</strong> {template.license}</div>
                        <div><strong>Downloads:</strong> {template.downloads}</div>
                        <div><strong>Rating:</strong> {template.averageRating}/5</div>
                      </div>
                      <div>
                        <strong>Tags:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {template.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Reviews</h4>
                        <div className="space-y-3 max-h-40 overflow-y-auto">
                          {template.reviews.slice(0, 3).map((review) => (
                            <div key={review.id} className="border-b pb-2">
                              <div className="flex items-center gap-2 mb-1">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={review.user.image} />
                                  <AvatarFallback>{review.user.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{review.user.name}</span>
                                {renderStars(review.rating)}
                              </div>
                              <p className="text-sm text-gray-600">{review.comment}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setReviewDialog(true)}
                        disabled={!user}
                      >
                        Write Review
                      </Button>
                      <Button
                        onClick={() => handlePurchase(template.id, template.price)}
                        disabled={!user}
                      >
                        {template.price === 0 ? 'Use Template' : `Purchase for $${template.price}`}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button
                  size="sm"
                  onClick={() => handlePurchase(template.id, template.price)}
                  disabled={!user}
                >
                  {template.price === 0 ? 'Use' : 'Buy'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
            <DialogDescription>
              Share your experience with {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rating</label>
              {renderStars(newReview.rating, true, (rating) => 
                setNewReview(prev => ({ ...prev, rating }))
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Comment</label>
              <Textarea
                value={newReview.comment}
                onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Share your thoughts about this template..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={submitReview}>Submit Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {filteredTemplates.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">No templates found matching your criteria.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setPriceFilter('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
