# create experience/submit empty form/reset/form errors/success

1. When app renders

2. Description field should be visible

3. Show description button should not be visible

4. Hide description button should be visible

5. When hide description button is clicked

6. Description field should not be visible

7. Hide description button should not be visible

8. Show description button should be visible

9. When show description button is clicked

10. Show description button should be visible

11. Hide description button should be visible

12. Title field should not contain error

13. Definition field should not contain error

14. Warning notification should not be visible

15. When empty form is submitted

16. Warning notification should be visible

17. Title field error should be visible

18. Definition field error should be visible

19. When title field is completed

20. When description field is completed

21. When definition name field is completed

22. When definition type field is completed

23. Form fields should contain user inputs

24. When hide description button is clicked

25. Description field should not be visible

26. When form is reset

27. All form fields should be empty

28. All errors should not be visible

29. Description field should be visible

30. Warning notification should not be visible

31. When form fields are completed

32. Given there is connection

33. Given that when form submitted, error will be returned from server

34. Error notification should not be visible

35. When form submitted

36. Error notification should be visible

37. Form errors should be visible

38. Page should have been scrolled to reveal errors

39. When notification closed

40. Notification should not be visible

41. Given that when form submitted there will be submission error from frontend

42. When form submitted

43. Error notification should be visible

44. Given that when form submitted server will return success

45. User should not have been navigated away

46. Cache should not have been updated

47. When form submitted

48. Correct data should have been sent to server

49. Page should be scrolled to reveal errors

50. Cache should have been updated

51. User should have been navigated away

52. When definition field added

53. New definition field added should be visible

54. Page should be scrolled to the newly added definition field

55. When bottom definition field moved up

56. Definition fields should be swapped

57. Page should be scrolled to definition field that was moved up

58. When top definition field moved down

59. Definition fields should have been swapped

60. Page should be scrolled to definition field that was moved down

61. When a definition field is deleted

62. There should only be one definition field left

63. Page should be scrolled to remaining definition field

64. Parent component should not be notified that app closed

65. When app closed

66. Parent component should be notified that app closed

## Implementation details

1. Description visibility / show / hide button via CSS classes

2. Notification as warning via CSS classes

3. Field errors via CSS classes -
   TODO: this can be fixed by moving field errors to top and put/remove from DOM (ala todoist.com)
