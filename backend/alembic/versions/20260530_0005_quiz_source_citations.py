"""quiz source citations

Revision ID: 20260530_0005
Revises: 20260529_0004
Create Date: 2026-05-30

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260530_0005"
down_revision: Union[str, None] = "20260529_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("quizzes") as batch_op:
        batch_op.add_column(sa.Column("source_citations", sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("quizzes") as batch_op:
        batch_op.drop_column("source_citations")
