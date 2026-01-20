'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { CATEGORIES, VISIBILITY_OPTIONS } from '@/lib/constants';

const CATEGORY_HELP_TEXT: Record<string, string> = {
  housing:
    'Mention location, budget, move-in date and whether it is for rent or flatmates.',
  buy_sell:
    'Mention item condition, expected price and pickup location.',
  recommendations:
    'Clearly describe what you are looking for so others can help.',
};

interface CreatePostDialogProps {
  userId: string;
  onPostCreated: () => void;
}

export function CreatePostDialog({
  userId,
  onPostCreated,
}: CreatePostDialogProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [category, setCategory] = useState<string>('');
  const [housingType, setHousingType] = useState<string>('');
  const [visibility, setVisibility] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!text.trim()) {
      setError('Please enter some text');
      setLoading(false);
      return;
    }

    if (!category) {
      setError('Please select a category');
      setLoading(false);
      return;
    }

    if (category === 'housing' && !housingType) {
      setError('Please select the housing type');
      setLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabase.from('posts').insert({
        user_id: userId,
        text: text.trim(),
        category,
        housing_type: category === 'housing' ? housingType : null,
        visibility,
      });

      if (insertError) throw insertError;

      setText('');
      setCategory('');
      setHousingType('');
      setVisibility('all');
      setOpen(false);
      onPostCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Post
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create a new post</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Housing sub-type */}
          {category === 'housing' && (
            <div>
              <Label>Housing type</Label>
              <Select value={housingType} onValueChange={setHousingType}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select housing type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flatmates">Flatmates</SelectItem>
                  <SelectItem value="rentals">Rentals</SelectItem>
                  <SelectItem value="sale">For Sale</SelectItem>
                  <SelectItem value="pg">PG</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Visibility */}
          <div>
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="text-xs text-neutral-500 mt-1">
              {visibility === 'company'
                ? 'Visible only to verified professionals from your company.'
                : 'Visible to verified professionals across all companies.'}
            </p>
          </div>

          {/* Post text */}
          <div>
            <Label>What do you need?</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Looking for a flat in Koramangala, 2BHK, budget 30k..."
              className="mt-1.5 min-h-[120px]"
              maxLength={2000}
            />
            <p className="text-xs text-neutral-500 mt-1.5">
              {text.length}/2000 characters
            </p>

            {category && (
              <p className="text-xs text-neutral-500 mt-2">
                {CATEGORY_HELP_TEXT[category]}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
