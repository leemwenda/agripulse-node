import unittest
from verify_route import interpret

class T(unittest.TestCase):
    def test_clear_cow(self): self.assertEqual(interpret(0.9, None, 0.0), "cow")
    def test_cow_with_person(self): self.assertEqual(interpret(0.8, "person", 0.95), "cow")
    def test_weak_cow_is_uncertain(self): self.assertEqual(interpret(0.3, "car", 0.9), "uncertain")
    def test_confident_object_no_cow(self): self.assertEqual(interpret(0.0, "car", 0.9), "not_cow")
    def test_low_confidence_object_is_uncertain(self): self.assertEqual(interpret(0.0, "car", 0.35), "uncertain")
    def test_nothing_detected_is_uncertain(self): self.assertEqual(interpret(0.0, None, 0.0), "uncertain")
    def test_thresholds_are_overridable(self): self.assertEqual(interpret(0.4, None, 0.0, cow_min=0.3), "cow")

if __name__ == "__main__":
    unittest.main()
