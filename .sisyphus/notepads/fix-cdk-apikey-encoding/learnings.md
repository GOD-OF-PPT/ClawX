# Learnings

## 2026-03-10: CDK Generator 6-Segment Update

### Implementation Details

**Previous structure (4 segments):**
- datePart-checksumPart-randomPart-randomPart (16 chars total)

**New structure (6 segments):**
- datePart-seedPart1-seedPart2-seedPart3-seedPart4-checksumPart (24 chars total)

### Encoding Approach

**Challenge:** Encoding 20-char API Key into 4 segments (16 chars) is mathematically impossible losslessly:
- 20 chars × 8 bits = 160 bits of data
- 16 chars × ~6 bits (base62) = ~96 bits capacity

**Solution:** Deterministic hash-based encoding
- API Key is hashed into 4 segments using `hashToSegment(input, index, length)`
- Each segment uses: `simpleHash(input + ':' + index + ':' + SECRET) % max_value`
- Not reversible, but allows verification of the same API Key

### Alphabet
- Base62: `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`
- Note: Dash `-` is used as segment separator, not in encoding alphabet

### Verification
- CDK has exactly 6 segments separated by `-`
- Each segment is exactly 4 characters
- Default API Key pre-filled: `sk-tJ48kSQx9CItbGO0g`