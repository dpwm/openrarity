import metadata from './metadata.json' with { type: "json" };
import their_scores from './pulsephunks_scores.json' with { type: "json" };

// This is just a script to demonstrate how to calculate for one collection.
// It’s been written so it just needs to be put in a function.

// openrank inserts this trait_type with the string value of the number of traits.
// The number of traits therefore impacts on rarity of a token.
// Without including this, we get different rarity results. The exact value of the string probably
// doesn’t matter so much as long as it cannot collide with user-provided attribute names.
//
const TRAIT_COUNT = 'meta_trait:trait_count';

// We need to know all trait_types and their possible values. We’ll create a map String -> Set(string) 
const trait_types = {};
trait_types[TRAIT_COUNT] = new Set()
metadata.collection.forEach(token => {
  token.attributes.forEach(({ trait_type, value }) => {
    const x = trait_types[trait_type] = trait_types[trait_type] || new Set();
    x.add(value);
  });
  trait_types[TRAIT_COUNT].add(token.attributes.length.toString());
})

// We convert the value sets to sorted arrays of strings.
const sorted_trait_types = Object.keys(trait_types).sort();
sorted_trait_types.forEach(k => {
  trait_types[k] = [...trait_types[k]].sort();
})

// Take token metadata, extract the attributes and convert them to an array. This should return an
// array of ints. An integer of 0 is equivalent to the trait_type being unset.
function get_attributes(x) {
  const attrs = Array(sorted_trait_types.length).fill(0);
  x.attributes.forEach(({ trait_type, value }) => {
    const ix = sorted_trait_types.indexOf(trait_type);
    attrs[ix] = 1 + trait_types[trait_type].indexOf(value);
  });
  const ix = sorted_trait_types.indexOf(TRAIT_COUNT)
  attrs[ix] = 1 + trait_types[TRAIT_COUNT].indexOf(x.attributes.length.toString());
  return attrs;
}
const token_attributes = metadata.collection.map(get_attributes);

// Set up the counts array
const counts = sorted_trait_types.map(k => {
  return new Array(trait_types[k].length + 1).fill(0);
})
token_attributes.forEach(ks => {
  ks.forEach((x, i) => { counts[i][x]++; })
})

// Calculate the "collection entropy" (again another term that normally means something completely
// different)
var collection_entropy = 0;
counts.forEach((xs) => {
  xs.forEach((count) => {
    if (count == 0) return;
    const p_i = count / metadata.collection.length;
    collection_entropy += -p_i * Math.log2(p_i);
  });
})

// Calculate the scores
const scores = token_attributes.map(x => {
  const norm = 1.0 / collection_entropy;
  var out = 0;
  x.forEach((k, i) => {
    const p_i = counts[i][k] / metadata.collection.length;
    out += -Math.log2(p_i);
  });
  return out * norm;
})

// Dump out the scores
their_scores.forEach((_, i) => {
  console.log(their_scores[i], scores[i], their_scores[i] / scores[i]);
})
