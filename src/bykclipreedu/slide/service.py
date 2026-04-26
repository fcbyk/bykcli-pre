import os


if 'DISPLAY' not in os.environ:
    os.environ['DISPLAY'] = ':0'

try:
    import pyautogui
except Exception:
    class MockPyAutoGUI:
        FAILSAFE = False
        
        @staticmethod
        def press(*args, **kwargs):
            pass
        
        @staticmethod
        def position():
            return (0, 0)
        
        @staticmethod
        def moveTo(*args, **kwargs):
            pass
        
        @staticmethod
        def click(*args, **kwargs):
            pass
        
        @staticmethod
        def rightClick(*args, **kwargs):
            pass
        
        @staticmethod
        def scroll(*args, **kwargs):
            pass
        
        @staticmethod
        def hscroll(*args, **kwargs):
            pass

        @staticmethod
        def mouseDown(*args, **kwargs):
            pass

        @staticmethod
        def mouseUp(*args, **kwargs):
            pass
    
    pyautogui = MockPyAutoGUI()


class SlideService:
        
    def __init__(self, password: str):
        self.password = password
        pyautogui.FAILSAFE = False
        
    
    def verify_password(self, password: str) -> bool:
        return password == self.password
    
    def next_slide(self) -> tuple[bool, str | None]:
        try:
            pyautogui.press('right')
            return True, None
        except Exception as e:
            return False, str(e)
    
    def prev_slide(self) -> tuple[bool, str | None]:
        try:
            pyautogui.press('left')
            return True, None
        except Exception as e:
            return False, str(e)
    
    def home_slide(self) -> tuple[bool, str | None]:
        try:
            pyautogui.press('home')
            return True, None
        except Exception as e:
            return False, str(e)
    
    def end_slide(self) -> tuple[bool, str | None]:
        try:
            pyautogui.press('end')
            return True, None
        except Exception as e:
            return False, str(e)
    
    def move_mouse(self, dx: int, dy: int) -> tuple[bool, str | None]:
        try:
            current_x, current_y = pyautogui.position()
            pyautogui.moveTo(current_x + dx, current_y + dy, duration=0)
            return True, None
        except Exception as e:
            return False, str(e)
    
    def click_mouse(self) -> tuple[bool, str | None]:
        try:
            pyautogui.click()
            return True, None
        except Exception as e:
            return False, str(e)
    
    def mouse_down(self) -> tuple[bool, str | None]:
        try:
            pyautogui.mouseDown()
            return True, None
        except Exception as e:
            return False, str(e)
    
    def mouse_up(self) -> tuple[bool, str | None]:
        try:
            pyautogui.mouseUp()
            return True, None
        except Exception as e:
            return False, str(e)
    
    def right_click_mouse(self) -> tuple[bool, str | None]:
        try:
            pyautogui.rightClick()
            return True, None
        except Exception as e:
            return False, str(e)
    
    def scroll_mouse(self, dx: int, dy: int) -> tuple[bool, str | None]:
        try:
            if dy != 0:
                scroll_clicks = int(round(dy))
                scroll_clicks = max(-100, min(100, scroll_clicks))
                if scroll_clicks != 0:
                    pyautogui.scroll(scroll_clicks)
            
            if dx != 0:
                hscroll_clicks = int(round(dx))
                hscroll_clicks = max(-100, min(100, hscroll_clicks))
                if hscroll_clicks != 0:
                    pyautogui.hscroll(hscroll_clicks)
            
            return True, None
        except Exception as e:
            return False, str(e)
